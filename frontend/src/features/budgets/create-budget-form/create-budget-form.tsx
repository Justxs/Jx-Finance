import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateBudgetEndpoint, useUpdateBudgetEndpoint } from "@/api/generated";
import type { CategoryResponse, BudgetResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isPositiveMoney } from "@/lib/validation";

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
    categoryId: z.string().min(1, t("validation.required")),
    limitAmount: z.string().refine(isPositiveMoney, t("validation.positiveMoney")),
  });

  const createMutation = useCreateBudgetEndpoint({ mutation: { onSuccess: onCreated } });

  const updateMutation = useUpdateBudgetEndpoint({ mutation: { onSuccess: onCreated } });

  const defaultValues: FormValues = {
    categoryId: initial?.categoryId ?? expenseCategories[0]?.id ?? "",
    limitAmount: initial?.limitAmount ?? "",
  };

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      const data = { categoryId: value.categoryId, limitAmount: value.limitAmount };
      if (initial?.id) {
        updateMutation.mutate({ id: initial.id, data });
      } else {
        createMutation.mutate({ data });
      }
    },
  });

  if (expenseCategories.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("budgets.needCategory")}</p>;
  }

  return (
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
            <div className="space-y-1.5">
              <Label htmlFor="budget-category">{t("budgets.category")}</Label>
              <SelectField
                id="budget-category"
                value={field.value}
                onBlur={field.handleBlur}
                onChange={(value) => field.handleChange(value)}
                options={expenseCategories.map((category) => ({
                  value: category.id!,
                  label: category.name,
                }))}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="limitAmount">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="budget-limit">{t("budgets.limit")}</Label>
              <Input
                id="budget-limit"
                inputMode="decimal"
                placeholder="0.00"
                value={field.value}
                aria-invalid={field.errors.length > 0}
                aria-describedby={field.errors.length > 0 ? "budget-limit-error" : undefined}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError id="budget-limit-error" message={field.errors[0]?.message} />
            </div>
          )}
        </form.Field>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button
              type="submit"
              pending={createMutation.isPending || updateMutation.isPending}
              disabled={!canSubmit}
            >
              {t(initial ? "actions.save" : "budgets.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
