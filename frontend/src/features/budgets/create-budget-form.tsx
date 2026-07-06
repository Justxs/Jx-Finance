import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateBudgetEndpoint } from "@/api/generated";
import type { CategoryResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { isPositiveMoney } from "@/lib/validation";

interface FormValues {
  categoryId: string;
  limitAmount: string;
}

interface Props {
  categories: CategoryResponse[];
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateBudgetForm({ categories, onCreated, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const schema = z.object({
    categoryId: z.string().min(1, t("validation.required")),
    limitAmount: z.string().refine(isPositiveMoney, t("validation.positiveMoney")),
  });

  const createMutation = useCreateBudgetEndpoint({ mutation: { onSuccess: onCreated } });

  const defaultValues: FormValues = {
    categoryId: expenseCategories[0]?.id ?? "",
    limitAmount: "",
  };

  const form = useForm({
    defaultValues,
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      createMutation.mutate({
        data: { categoryId: value.categoryId, limitAmount: value.limitAmount },
      });
      form.reset();
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
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="categoryId">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="budget-category">{t("budgets.category")}</Label>
              <Select
                id="budget-category"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              >
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
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
                value={field.state.value}
                aria-invalid={field.state.meta.errors.length > 0}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError message={field.state.meta.errors[0]?.message} />
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
            <Button type="submit" disabled={createMutation.isPending || !canSubmit}>
              {t("budgets.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
