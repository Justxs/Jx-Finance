import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  CategoryResponse,
  DebtResponse,
  RecurringBillShape,
} from "@/api/generated/model";
import { SpreadFields } from "@/components/spread-fields/spread-fields";
import { namedOptions } from "@/lib/options";
import type { RecurringBillFormApi } from "./use-recurring-bill-form";

interface Props {
  form: RecurringBillFormApi;
  fieldId: string;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  payableDebts: DebtResponse[];
}

export function BillTargetFields({
  form,
  fieldId,
  accounts,
  categories,
  payableDebts,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const accountOptions = namedOptions(accounts, t("recurringBills.noAccount"));

  function categoryOptionsFor(shape: RecurringBillShape) {
    return namedOptions(
      categories.filter((category) => category.type === shape),
      t("recurringBills.noCategory"),
    );
  }

  return (
    <form.Subscribe selector={(state) => state.values.shape}>
      {(shape) => (
        <>
          <form.Field name="categoryId">
            {(field) =>
              shape === "transfer" ? (
                <p className="pt-6 text-xs text-muted-foreground">
                  {t("recurringBills.transferNoCategory")}
                </p>
              ) : (
                <field.SelectFieldControl
                  id={`${fieldId}-category`}
                  kind="search"
                  label={t("recurringBills.category")}
                  options={categoryOptionsFor(shape)}
                />
              )
            }
          </form.Field>

          <form.Field name="accountId">
            {(field) => (
              <field.SelectFieldControl
                id={`${fieldId}-account`}
                label={
                  shape === "transfer"
                    ? t("recurringBills.fromAccount")
                    : t("recurringBills.account")
                }
                placeholder={shape === "transfer" ? t("recurringBills.chooseAccount") : undefined}
                options={shape === "transfer" ? namedOptions(accounts) : accountOptions}
              />
            )}
          </form.Field>

          <form.Field name="matchKey">
            {(field) => (
              <field.TextField
                id={`${fieldId}-match-key`}
                label={t("recurringBills.matchKey")}
                hint={t("recurringBills.matchKeyHint")}
              />
            )}
          </form.Field>

          {shape === "expense" && payableDebts.length > 0 ? (
            <form.Field name="debtId">
              {(field) => (
                <field.SelectFieldControl
                  id={`${fieldId}-debt`}
                  label={t("recurringBills.debt")}
                  hint={t("recurringBills.debtHint")}
                  options={namedOptions(payableDebts, t("recurringBills.noDebt"))}
                />
              )}
            </form.Field>
          ) : null}

          {shape === "transfer" ? null : (
            <SpreadFields
              form={form}
              fields={{
                spread: "spread",
                spreadCustom: "spreadCustom",
                spreadDirection: "spreadDirection",
              }}
              idPrefix={fieldId}
            />
          )}

          {shape === "transfer" ? (
            <form.Field name="toAccountId">
              {(field) => (
                <field.SelectFieldControl
                  id={`${fieldId}-to-account`}
                  label={t("recurringBills.toAccount")}
                  placeholder={t("recurringBills.chooseAccount")}
                  options={namedOptions(accounts)}
                />
              )}
            </form.Field>
          ) : null}
        </>
      )}
    </form.Subscribe>
  );
}
