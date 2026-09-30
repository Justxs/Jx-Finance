import { X } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  CategoryResponse,
  TagResponse,
  TransactionResponse,
} from "@/api/generated/model";
import { MoneyPairField } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { TagPicker } from "@/components/tag-picker/tag-picker";
import { Button } from "@/components/ui/button/button";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { Label } from "@/components/ui/label/label";
import { heldCurrencies } from "@/features/accounts/held-currencies";
import { ClosedMonthHint } from "@/features/month-close/closed-month-hint/closed-month-hint";
import {
  FillFromReceipt,
  type ReceiptCandidateSplit,
} from "@/features/transactions/receipt-reading/fill-from-receipt";
import { EMPTY_VALUE, useIsoDate } from "@/hooks/use-formatters";
import { useSettings } from "@/hooks/use-settings";
import { namedOptions } from "@/lib/options";
import { emptyLine } from "./line-form-value";
import { SaveTemplateControl } from "./save-template-control";
import { SplitLinesEditor } from "./split-lines-editor";
import type { TransactionDraft } from "./transaction-draft";
import { TransactionFormActions } from "./transaction-form-actions";
import {
  type TransactionFormValues,
  categoryTypeOf,
  toSubmittedValues,
} from "./transaction-schema";
import {
  type SubmitIntent,
  type TransactionFormApi,
  useTransactionForm,
} from "./use-transaction-form";

export type { TransactionFormValues } from "./transaction-schema";
export type { TransactionFormApi } from "./use-transaction-form";

interface CategoryFieldProps {
  form: TransactionFormApi;
  categories: CategoryResponse[];
}

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
  initial?: TransactionResponse;
  prefill?: TransactionDraft;
  pending: boolean;
  error?: unknown;
  onSubmit: (values: TransactionFormValues) => Promise<unknown> | void;
  onSubmitAndAddAnother?: (values: TransactionFormValues) => Promise<boolean>;
  onSaveAsTemplate?: (name: string, values: TransactionFormValues) => void;
  onCancel?: () => void;
  onReceiptFile?: (file: File) => void;
  onSplitCandidate?: (split: ReceiptCandidateSplit) => void;
}

function RefundOfLine({ form }: Readonly<{ form: TransactionFormApi }>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();

  return (
    <form.Subscribe
      selector={(state) => (state.values.type === "refund" ? state.values.refundOf : null)}
    >
      {(original) =>
        original ? (
          <p className="col-span-full flex items-center gap-1 text-sm text-muted-foreground">
            {t("transactions.refundOf", {
              description: original.description || EMPTY_VALUE,
              date: formatDate(original.date),
            })}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("transactions.refundOfClear")}
              onClick={() => form.setFieldValue("refundOf", null)}
            >
              <X />
            </Button>
          </p>
        ) : null
      }
    </form.Subscribe>
  );
}

function CategoryField({ form, categories }: Readonly<CategoryFieldProps>) {
  const { t } = useTranslation();

  return (
    <form.Field name="type">
      {(typeField) => (
        <form.Field name="categoryId">
          {(field) => (
            <field.SelectFieldControl
              id="tx-category"
              kind="search"
              label={t("transactions.category")}
              options={namedOptions(
                categories.filter((c) => c.type === categoryTypeOf(typeField.value)),
                t("transactions.uncategorized"),
              )}
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
  tags,
  initial,
  prefill,
  pending,
  error,
  onSubmit,
  onSubmitAndAddAnother,
  onSaveAsTemplate,
  onCancel,
  onReceiptFile,
  onSplitCandidate,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { receiptReadingReady } = useSettings();
  const intent = useRef<SubmitIntent>("save");
  const amountInput = useRef<HTMLInputElement>(null);
  const [anotherPending, setAnotherPending] = useState(false);
  const form = useTransactionForm({
    accounts,
    initial,
    prefill,
    onSubmit,
    onSubmitAndAddAnother,
    intent,
    amountInput,
    onAnotherSettled: () => setAnotherPending(false),
  });

  function submitAndAddAnother() {
    intent.current = "another";
    setAnotherPending(true);
    void form.handleSubmit();
  }

  return (
    <form.AppForm>
      <form.FormShell
        as={FormGrid}
        onBeforeSubmit={() => {
          intent.current = "save";
          setAnotherPending(false);
        }}
      >
        <form.Field name="type">
          {(field) => (
            <field.SelectFieldControl
              id="tx-type"
              kind="segments"
              label={t("transactions.type")}
              options={[
                { value: "expense", label: t("transactions.expense") },
                { value: "income", label: t("transactions.income") },
                { value: "refund", label: t("transactions.refund") },
              ]}
              onValueChange={(next) => {
                const categoryId = form.getFieldValue("categoryId");
                const type = categoryTypeOf(next);
                if (categoryId && !categories.some((c) => c.id === categoryId && c.type === type)) {
                  form.setFieldValue("categoryId", "");
                }
                if (next === "refund") {
                  form.setFieldValue("isSplit", false);
                }
              }}
            />
          )}
        </form.Field>

        <RefundOfLine form={form} />

        <form.Field name="accountId">
          {(field) => (
            <field.SelectFieldControl
              id="tx-account"
              label={t("transactions.account")}
              options={namedOptions(accounts)}
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
            <MoneyPairField
              form={form}
              fields={{ amount: "amount", currency: "currency" }}
              id="tx-amount"
              ref={amountInput}
              label={t("transactions.amount")}
              currencyLabel={t("transactions.currency")}
              preferred={heldCurrencies(accounts.find((account) => account.id === accountId))}
            />
          )}
        </form.Subscribe>

        <form.Field name="date">
          {(field) => (
            <ClosedMonthHint date={field.value}>
              {(hint) => (
                <field.DateField id="tx-date" label={t("transactions.date")} hint={hint} />
              )}
            </ClosedMonthHint>
          )}
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

        <form.Field name="note">
          {(field) => (
            <field.TextField
              id="tx-note"
              label={t("transactions.note")}
              hint={t("transactions.noteHint")}
              className="col-span-full"
            />
          )}
        </form.Field>

        {tags.length > 0 ? (
          <form.Field name="tagIds">
            {(field) => (
              <div className="col-span-full space-y-1.5">
                <Label>{t("tags.field")}</Label>
                <TagPicker
                  tags={tags}
                  value={field.value}
                  onChange={field.handleChange}
                  aria-label={t("tags.field")}
                />
              </div>
            )}
          </form.Field>
        ) : null}

        <form.Subscribe selector={(state) => state.values.type === "refund"}>
          {(refund) =>
            refund ? null : (
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
            )
          }
        </form.Subscribe>

        {receiptReadingReady ? (
          <form.Subscribe selector={(state) => state.values.type === "expense"}>
            {(expense) =>
              expense ? (
                <FillFromReceipt
                  form={form}
                  categories={categories}
                  transactionId={initial?.id}
                  onReceiptFile={onReceiptFile}
                  onSplitCandidate={onSplitCandidate}
                />
              ) : null
            }
          </form.Subscribe>
        ) : null}

        <SplitLinesEditor
          form={form}
          fields={{
            type: "type",
            amount: "amount",
            currency: "currency",
            isSplit: "isSplit",
            lines: "lines",
          }}
          categories={categories}
        />

        <FormError error={error} />

        {onSaveAsTemplate && !initial ? (
          <form.Subscribe selector={(state) => state.values}>
            {(values) => (
              <SaveTemplateControl
                onSave={(name) => onSaveAsTemplate(name, toSubmittedValues(values))}
              />
            )}
          </form.Subscribe>
        ) : null}

        <TransactionFormActions
          form={form}
          editing={Boolean(initial)}
          pending={pending}
          anotherPending={anotherPending}
          onAnother={onSubmitAndAddAnother && !initial ? submitAndAddAnother : undefined}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
