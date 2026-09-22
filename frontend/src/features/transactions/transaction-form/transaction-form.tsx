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
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { Label } from "@/components/ui/label/label";
import { heldCurrencies } from "@/features/accounts/held-currencies";
import { TagPicker } from "@/features/tags/tag-picker/tag-picker";
import { namedOptions } from "@/lib/options";
import { emptyLine } from "./line-form-value";
import { SaveTemplateControl } from "./save-template-control";
import { SplitLinesEditor } from "./split-lines-editor";
import type { TransactionDraft } from "./transaction-draft";
import { TransactionFormActions } from "./transaction-form-actions";
import { type TransactionFormValues, toSubmittedValues } from "./transaction-schema";
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
              label={t("transactions.category")}
              options={namedOptions(
                categories.filter((c) => c.type === typeField.value),
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
}: Readonly<Props>) {
  const { t } = useTranslation();
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

        <SplitLinesEditor
          form={form}
          fields={{ type: "type", isSplit: "isSplit", lines: "lines" }}
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
