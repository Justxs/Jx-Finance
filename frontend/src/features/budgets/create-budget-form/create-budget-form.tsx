import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateBudget, useUpdateBudget } from "@/api/generated";
import type { CategoryResponse, BudgetResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { silent, upsert } from "@/lib/mutations";
import { positiveMoney, requiredValue } from "@/lib/validation";

interface FormValues {
  categoryId: string;
  limitAmount: string;
}

interface Props {
  categories: CategoryResponse[];
  initial?: BudgetResponse;
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateBudgetForm({ categories, initial, onCreated, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const schema = z.object({
    categoryId: requiredValue(t),
    limitAmount: positiveMoney(t),
  });

  const { create, update, pending, error } = upsert(
    useCreateBudget(silent({ onSuccess: onCreated })),
    useUpdateBudget(silent({ onSuccess: onCreated })),
  );

  const defaultValues: FormValues = {
    categoryId: initial?.categoryId ?? expenseCategories[0]?.id ?? "",
    limitAmount: initial?.limitAmount ?? "",
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => {
      const data = { categoryId: value.categoryId, limitAmount: value.limitAmount };

      return initial?.id ? update({ id: initial.id, data }) : create({ data });
    },
  });

  if (expenseCategories.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("budgets.needCategory")}</p>;
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
        </FormGrid>

        <FormError error={error} />

        <form.FormActions
          pending={pending}
          submitLabel={t(initial ? "actions.save" : "budgets.add")}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
