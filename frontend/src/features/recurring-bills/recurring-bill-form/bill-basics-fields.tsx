import { useTranslation } from "react-i18next";
import { RecurringBillCadence, RecurringBillKind, RecurringBillShape } from "@/api/generated/model";
import { optionsOf } from "@/lib/options";
import type { RecurringBillFormApi } from "./use-recurring-bill-form";

interface Props {
  form: RecurringBillFormApi;
  fieldId: string;
  editing: boolean;
}

export function BillBasicsFields({ form, fieldId, editing }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <>
      <form.Field name="name">
        {(field) => (
          <field.TextField
            id={`${fieldId}-name`}
            label={t("recurringBills.name")}
            placeholder={editing ? undefined : t("recurringBills.namePlaceholder")}
          />
        )}
      </form.Field>

      <form.Field name="shape">
        {(field) => (
          <field.SelectFieldControl
            id={`${fieldId}-shape`}
            kind="segments"
            label={t("recurringBills.shape")}
            options={optionsOf(Object.values(RecurringBillShape), (shape) =>
              t(`recurringBills.shapes.${shape}`),
            )}
          />
        )}
      </form.Field>

      <form.Field name="kind">
        {(field) => (
          <field.SelectFieldControl
            id={`${fieldId}-kind`}
            label={t("recurringBills.kind")}
            options={optionsOf(Object.values(RecurringBillKind), (kind) =>
              t(`recurringBills.kinds.${kind}`),
            )}
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.kind}>
        {(kind) => (
          <form.Field name="amount">
            {(field) =>
              kind === "fixed" ? (
                <field.MoneyInputField
                  id={`${fieldId}-amount`}
                  label={t("recurringBills.amount")}
                />
              ) : (
                <p className="pt-6 text-xs text-muted-foreground">
                  {t("recurringBills.variableAmountHint")}
                </p>
              )
            }
          </form.Field>
        )}
      </form.Subscribe>

      <form.Field name="cadence">
        {(field) => (
          <field.SelectFieldControl
            id={`${fieldId}-cadence`}
            label={t("recurringBills.cadence")}
            options={optionsOf(Object.values(RecurringBillCadence), (cadence) =>
              t(`recurringBills.cadences.${cadence}`),
            )}
          />
        )}
      </form.Field>
    </>
  );
}
