import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateBudget, useUpdateBudget } from "@/api/generated";
import type { CategoryResponse, BudgetResponse } from "@/api/generated/model";
import { useAppForm } from "@/components/form";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { submitToServer } from "@/lib/form-server-errors";
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

  const createMutation = useCreateBudget({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });

  const updateMutation = useUpdateBudget({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });

  const defaultValues: FormValues = {
    categoryId: initial?.categoryId ?? expenseCategories[0]?.id ?? "",
    limitAmount: initial?.limitAmount ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) => {
      const { value } = submission;
      const data = { categoryId: value.categoryId, limitAmount: value.limitAmount };

      return submitToServer(submission, () =>
        initial?.id
          ? updateMutation.mutateAsync({ id: initial.id, data })
          : createMutation.mutateAsync({ data }),
      );
    },
  });

  if (expenseCategories.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("budgets.needCategory")}</p>;
  }

  return (
    <form.AppForm>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        noValidate
        className="space-y-4"
      >
        <div className="form-grid">
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
        </div>

        <FormError error={createMutation.error ?? updateMutation.error} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
          <form.SubmitButton pending={createMutation.isPending || updateMutation.isPending}>
            {t(initial ? "actions.save" : "budgets.add")}
          </form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}
