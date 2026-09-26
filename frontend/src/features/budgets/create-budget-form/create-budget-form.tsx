import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateBudget, useUpdateBudget } from "@/api/generated";
import { BudgetPeriod, type CategoryResponse, type BudgetResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { silent, upsert } from "@/lib/mutations";
import { positiveMoney, requiredValue } from "@/lib/validation";
import { budgetPeriodOptions } from "../budget-periods";

interface FormValues {
  categoryId: string;
  limitAmount: string;
  period: BudgetPeriod;
  rolloverEnabled: boolean;
}

interface Props {
  categories: CategoryResponse[];
  initial?: BudgetResponse;
  onClose: () => void;
}

export function CreateBudgetForm({ categories, initial, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const schema = z.object({
    categoryId: requiredValue(t),
    limitAmount: positiveMoney(t),
    period: z.enum(BudgetPeriod),
    rolloverEnabled: z.boolean(),
  });

  const { create, update, pending, error } = upsert(
    useCreateBudget(silent({ onSuccess: onClose })),
    useUpdateBudget(silent({ onSuccess: onClose })),
  );

  const defaultValues: FormValues = {
    categoryId: initial?.categoryId ?? expenseCategories[0]?.id ?? "",
    limitAmount: initial?.limitAmount ?? "",
    period: initial?.period ?? "monthly",
    rolloverEnabled: initial?.rolloverEnabled ?? false,
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) =>
      initial?.id ? update({ id: initial.id, data: value }) : create({ data: value }),
  });

  if (expenseCategories.length === 0) {
    return <EmptyText size="sm">{t("budgets.needCategory")}</EmptyText>;
  }

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <FormGrid>
          <form.Field name="categoryId">
            {(field) => (
              <field.SelectFieldControl
                id="budget-category"
                label={t("budgets.category")}
                options={expenseCategories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
              />
            )}
          </form.Field>

          <form.Field name="limitAmount">
            {(field) => <field.MoneyInputField id="budget-limit" label={t("budgets.limit")} />}
          </form.Field>

          <form.Field name="period">
            {(field) => (
              <field.SelectFieldControl
                id="budget-period"
                label={t("budgets.period")}
                options={budgetPeriodOptions(t)}
              />
            )}
          </form.Field>

          <form.Field name="rolloverEnabled">
            {(field) => (
              <field.CheckboxField
                id="budget-rollover"
                label={t("budgets.rollover")}
                hint={t("budgets.rolloverHint")}
                className="col-span-full"
              />
            )}
          </form.Field>
        </FormGrid>

        <FormError error={error} />

        <form.FormActions
          pending={pending}
          submitLabel={t(initial ? "actions.save" : "budgets.add")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
