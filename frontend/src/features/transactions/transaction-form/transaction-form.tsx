import { type RefObject, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  type AccountResponse,
  type CategoryResponse,
  Currency,
  type FlowType,
  type TransactionResponse,
} from "@/api/generated/model";
import { useAppForm } from "@/components/form";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { FormGrid } from "@/components/ui/form-grid";
import { Label } from "@/components/ui/label";
import { heldCurrencies } from "@/features/accounts/held-currencies";
import { useMoney } from "@/hooks/use-formatters";
import { useSettingsSuspense, useToday } from "@/hooks/use-settings";
import { submitToServer } from "@/lib/form-server-errors";
import { toCents } from "@/lib/money";
import { isPositiveMoney, positiveMoney, requiredValue } from "@/lib/validation";
import { emptyLine, type LineFormValue } from "./line-form-value";
import { SplitLinesEditor } from "./split-lines-editor";

interface TransactionLineFormValues {
  categoryId: string | null;
  amount: string;
  description: string | null;
}

export interface TransactionFormValues {
  accountId: string;
  categoryId: string | null;
  type: FlowType;
  amount: string;
  currency: Currency;
  date: string;
  description: string | null;
  lines: TransactionLineFormValues[] | null;
}

interface FormValues {
  type: FlowType;
  accountId: string;
  categoryId: string;
  amount: string;
  currency: Currency;
  date: string;
  description: string;
  isSplit: boolean;
  lines: LineFormValue[];
}

interface CategoryFieldProps {
  form: TransactionFormApi;
  categories: CategoryResponse[];
}

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  initial?: TransactionResponse;
  pending: boolean;
  error?: unknown;
  onSubmit: (values: TransactionFormValues) => Promise<unknown> | void;
  onSubmitAndAddAnother?: (values: TransactionFormValues) => Promise<boolean>;
  onCancel?: () => void;
}

type SubmitIntent = "save" | "another";

interface FormSource extends Pick<
  Props,
  "accounts" | "initial" | "onSubmit" | "onSubmitAndAddAnother"
> {
  intent: RefObject<SubmitIntent>;
  amountInput: RefObject<HTMLInputElement | null>;
  onAnotherSettled: () => void;
}

function useTransactionForm({
  accounts,
  initial,
  onSubmit,
  onSubmitAndAddAnother,
  intent,
  amountInput,
  onAnotherSettled,
}: Readonly<FormSource>) {
  const { t } = useTranslation();
  const money = useMoney();
  const today = useToday();

  const schema = z
    .object({
      type: z.enum(["income", "expense"]),
      accountId: requiredValue(t),
      categoryId: z.string(),
      amount: positiveMoney(t),
      currency: z.enum(Currency),
      date: requiredValue(t),
      description: z.string(),
      isSplit: z.boolean(),
      lines: z.array(
        z.object({
          id: z.string(),
          categoryId: z.string(),
          amount: z.string(),
          description: z.string(),
        }),
      ),
    })
    .superRefine((value, ctx) => {
      if (!value.isSplit) {
        return;
      }

      if (value.lines.length === 0 || !value.lines.every((line) => isPositiveMoney(line.amount))) {
        ctx.addIssue({ code: "custom", message: t("validation.positiveMoney"), path: ["lines"] });
        return;
      }

      if (isPositiveMoney(value.amount)) {
        const sum = value.lines.reduce((total, line) => total + toCents(line.amount), 0);
        const total = toCents(value.amount);
        if (sum !== total) {
          ctx.addIssue({
            code: "custom",
            message: t("transactions.splitTotalMismatch", {
              linesTotal: money.format(sum / 100, value.currency),
              total: money.format(total / 100, value.currency),
            }),
            path: ["lines"],
          });
        }
      }
    });

  const { defaultAccountId } = useSettingsSuspense();
  const defaultAccount = accounts.find((account) => account.id === defaultAccountId) ?? accounts[0];

  const defaultValues: FormValues = {
    type: initial?.type ?? "expense",
    accountId: initial?.accountId ?? defaultAccount?.id ?? "",
    categoryId: initial?.categoryId ?? "",
    amount: initial?.amount ?? "",
    currency: initial?.currency ?? defaultAccount?.currency ?? "eur",
    date: initial?.date ?? today,
    description: initial?.description ?? "",
    isSplit: initial?.isSplit ?? false,
    lines: initial?.lines?.length
      ? initial.lines.map((line) => ({
          id: line.id,
          categoryId: line.categoryId ?? "",
          amount: line.amount ?? "",
          description: line.description ?? "",
        }))
      : [],
  };

  const form = useAppForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: async (submission) => {
      const { value, formApi } = submission;
      const values: TransactionFormValues = {
        accountId: value.accountId,
        categoryId: value.isSplit ? null : value.categoryId || null,
        type: value.type,
        amount: value.amount,
        currency: value.currency,
        date: value.date,
        description: value.description.trim() || null,
        lines: value.isSplit
          ? value.lines.map((line) => ({
              categoryId: line.categoryId || null,
              amount: line.amount,
              description: line.description.trim() || null,
            }))
          : null,
      };

      if (intent.current !== "another" || !onSubmitAndAddAnother) {
        return submitToServer(submission, () => onSubmit(values));
      }

      let saved = false;
      const fieldErrors = await submitToServer(submission, async () => {
        saved = await onSubmitAndAddAnother(values);
      });
      onAnotherSettled();
      if (saved) {
        formApi.reset({
          ...defaultValues,
          type: value.type,
          accountId: value.accountId,
          currency: value.currency,
          date: value.date,
        });
        amountInput.current?.focus();
      }

      return fieldErrors;
    },
  });

  return form;
}

export type TransactionFormApi = ReturnType<typeof useTransactionForm>;

function CategoryField({ form, categories }: Readonly<CategoryFieldProps>) {
  const { t } = useTranslation();

  return (
    <form.Field name="type">
      {(typeField) => (
        <form.Field name="categoryId">
          {(field) => (
            <field.SelectFieldControl
              id="tx-category"
              label={t("transactions.category")}
              options={[
                { value: "", label: t("transactions.uncategorized") },
                ...categories
                  .filter((c) => c.type === typeField.value)
                  .map((category) => ({ value: category.id, label: category.name })),
              ]}
            />
          )}
        </form.Field>
      )}
    </form.Field>
  );
}

export function TransactionForm({
  accounts,
  categories,
  initial,
  pending,
  error,
  onSubmit,
  onSubmitAndAddAnother,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const intent = useRef<SubmitIntent>("save");
  const amountInput = useRef<HTMLInputElement>(null);
  const [anotherPending, setAnotherPending] = useState(false);
  const form = useTransactionForm({
    accounts,
    initial,
    onSubmit,
    onSubmitAndAddAnother,
    intent,
    amountInput,
    onAnotherSettled: () => setAnotherPending(false),
  });

  return (
    <form.AppForm>
      <FormGrid
        as="form"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          intent.current = "save";
          setAnotherPending(false);
          void form.handleSubmit();
        }}
        noValidate
      >
        <form.Field name="type">
          {(field) => (
            <field.SelectFieldControl
              id="tx-type"
              label={t("transactions.type")}
              options={[
                { value: "expense", label: t("transactions.expense") },
                { value: "income", label: t("transactions.income") },
              ]}
              onValueChange={(next) => {
                const categoryId = form.getFieldValue("categoryId");
                if (categoryId && !categories.some((c) => c.id === categoryId && c.type === next)) {
                  form.setFieldValue("categoryId", "");
                }
              }}
            />
          )}
        </form.Field>

        <form.Field name="accountId">
          {(field) => (
            <field.SelectFieldControl
              id="tx-account"
              label={t("transactions.account")}
              options={accounts.map((account) => ({ value: account.id, label: account.name }))}
              onValueChange={(value, previousId) => {
                const previous = accounts.find((account) => account.id === previousId);
                const next = accounts.find((account) => account.id === value);
                if (
                  next &&
                  form.getFieldValue("currency") === (previous?.currency ?? next.currency)
                ) {
                  form.setFieldValue("currency", next.currency);
                }
              }}
            />
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.isSplit}>
          {(isSplit) =>
            isSplit ? (
              <div className="space-y-1.5">
                <Label>{t("transactions.category")}</Label>
                <p className="pt-2 text-xs text-muted-foreground">
                  {t("transactions.splitTransaction")}
                </p>
              </div>
            ) : (
              <CategoryField form={form} categories={categories} />
            )
          }
        </form.Subscribe>

        <form.Subscribe selector={(state) => state.values.accountId}>
          {(accountId) => (
            <form.Field name="currency">
              {(currencyField) => (
                <form.Field name="amount">
                  {(field) => (
                    <field.MoneyAmountField
                      id="tx-amount"
                      ref={amountInput}
                      label={t("transactions.amount")}
                      currencyField={currencyField}
                      currencyLabel={t("transactions.currency")}
                      preferred={heldCurrencies(
                        accounts.find((account) => account.id === accountId),
                      )}
                    />
                  )}
                </form.Field>
              )}
            </form.Field>
          )}
        </form.Subscribe>

        <form.Field name="date">
          {(field) => <field.DateField id="tx-date" label={t("transactions.date")} />}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <field.TextField
              id="tx-description"
              label={t("transactions.description")}
              placeholder={t("transactions.descriptionPlaceholder")}
              className="col-span-full"
            />
          )}
        </form.Field>

        <form.Field name="isSplit">
          {(field) => (
            <field.CheckboxField
              id="tx-split"
              label={t("transactions.splitTransaction")}
              tone="muted"
              className="col-span-full"
              onCheckedChange={(next) => {
                if (next && form.getFieldValue("lines").length === 0) {
                  form.setFieldValue("lines", [emptyLine()]);
                }
              }}
            />
          )}
        </form.Field>

        <SplitLinesEditor form={form} categories={categories} />

        <FormError error={error} />

        <div className="col-span-full flex flex-wrap justify-end gap-2 pt-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("actions.cancel")}
            </Button>
          ) : null}
          <form.Subscribe selector={(state) => state.canSubmit}>
            {(canSubmit) => (
              <>
                {onSubmitAndAddAnother && !initial ? (
                  <Button
                    type="button"
                    variant="outline"
                    pending={pending && anotherPending}
                    disabled={!canSubmit || pending}
                    onClick={() => {
                      intent.current = "another";
                      setAnotherPending(true);
                      void form.handleSubmit();
                    }}
                  >
                    {t("transactions.saveAndAddAnother")}
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  pending={pending && !anotherPending}
                  disabled={!canSubmit || pending}
                >
                  {initial ? t("actions.save") : t("actions.add")}
                </Button>
              </>
            )}
          </form.Subscribe>
        </div>
      </FormGrid>
    </form.AppForm>
  );
}
