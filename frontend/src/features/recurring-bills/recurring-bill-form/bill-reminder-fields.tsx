import { useTranslation } from "react-i18next";
import {
  updateRecurringBillBodyRemindDaysBeforeMax,
  updateRecurringBillBodyRemindDaysBeforeMin,
} from "@/api/schemas/recurring-bills/recurring-bills.zod";
import type { RecurringBillFormApi } from "./use-recurring-bill-form";

interface Props {
  form: RecurringBillFormApi;
  fieldId: string;
  editing: boolean;
}

export function BillReminderFields({ form, fieldId, editing }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <>
      <form.Field name="nextDueDate">
        {(field) => (
          <field.DateField id={`${fieldId}-due-date`} label={t("recurringBills.nextDueDate")} />
        )}
      </form.Field>

      <form.Field name="remindDaysBefore">
        {(field) => (
          <field.TextField
            id={`${fieldId}-remind`}
            label={t("recurringBills.remindDaysBefore")}
            type="number"
            inputMode="numeric"
            min={updateRecurringBillBodyRemindDaysBeforeMin}
            max={updateRecurringBillBodyRemindDaysBeforeMax}
          />
        )}
      </form.Field>

      {editing ? (
        <form.Field name="isActive">
          {(field) => (
            <field.CheckboxField
              id={`${fieldId}-active`}
              label={t("recurringBills.active")}
              hint={t("recurringBills.activeHint")}
              className="col-span-full"
            />
          )}
        </form.Field>
      ) : null}
    </>
  );
}
