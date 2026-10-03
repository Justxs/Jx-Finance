import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  CategoryResponse,
  RecurringBillResponse,
} from "@/api/generated/model";
import { FormError } from "@/components/form-error/form-error";
import { SharingFields } from "@/components/sharing-fields/sharing-fields";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { BillBasicsFields } from "./bill-basics-fields";
import { BillReminderFields } from "./bill-reminder-fields";
import { BillTargetFields } from "./bill-target-fields";
import { type RecurringBillDraft, useRecurringBillForm } from "./use-recurring-bill-form";

interface Props {
  initial?: RecurringBillResponse;
  draft?: RecurringBillDraft;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  onClose: () => void;
}

export function RecurringBillForm({
  initial,
  draft,
  accounts,
  categories,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { form, pending, error, payableDebts } = useRecurringBillForm({ initial, draft, onClose });
  const fieldId = initial ? `bill-${initial.id}` : "bill";
  const editing = initial !== undefined;

  if (!initial && accounts.length === 0) {
    return <EmptyText size="sm">{t("recurringBills.needAccount")}</EmptyText>;
  }

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <BillBasicsFields form={form} fieldId={fieldId} editing={editing} />
        <BillTargetFields
          form={form}
          fieldId={fieldId}
          accounts={accounts}
          categories={categories}
          payableDebts={payableDebts}
        />
        <BillReminderFields form={form} fieldId={fieldId} editing={editing} />

        <SharingFields
          form={form}
          fields={{ scope: "scope", householdId: "householdId" }}
          idPrefix={fieldId}
        />

        <FormError error={error} />

        <form.FormActions
          span
          pending={pending}
          submitLabel={initial ? t("actions.save") : t("recurringBills.add")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
