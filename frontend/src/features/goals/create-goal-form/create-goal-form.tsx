import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateGoal, useUpdateGoal } from "@/api/generated";
import type { GoalResponse } from "@/api/generated/model";
import { createGoalBodyNameMax } from "@/api/schemas/goals/goals.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { silent, upsert } from "@/lib/mutations";
import { optionalNonNegativeMoney, positiveMoney, requiredText } from "@/lib/validation";

interface FormValues {
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
}

interface Props {
  initial?: GoalResponse;
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateGoalForm({ initial, onCreated, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z.object({
    name: requiredText(t, createGoalBodyNameMax),
    targetAmount: positiveMoney(t),
    currentAmount: optionalNonNegativeMoney(t),
    targetDate: z.string(),
  });

  const { create, update, pending, error } = upsert(
    useCreateGoal(silent({ onSuccess: onCreated })),
    useUpdateGoal(silent({ onSuccess: onCreated })),
  );

  const defaultValues: FormValues = {
    name: initial?.name ?? "",
    targetAmount: initial?.targetAmount ?? "",
    currentAmount: initial?.currentAmount ?? "",
    targetDate: initial?.targetDate ?? "",
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => {
      const name = value.name.trim();
      const targetDate = value.targetDate || null;

      return initial?.id
        ? update({
            id: initial.id,
            data: {
              name,
              targetAmount: value.targetAmount,
              currentAmount: value.currentAmount || "0",
              targetDate,
            },
          })
        : create({
            data: {
              name,
              targetAmount: value.targetAmount,
              currentAmount: value.currentAmount || null,
              targetDate,
            },
          });
    },
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <FormGrid>
          <form.Field name="name">
            {(field) => (
              <field.TextField
                id="goal-name"
                label={t("goals.name")}
                placeholder={t("goals.namePlaceholder")}
              />
            )}
          </form.Field>

          <form.Field name="targetAmount">
            {(field) => <field.MoneyInputField id="goal-target" label={t("goals.targetAmount")} />}
          </form.Field>

          <form.Field name="currentAmount">
            {(field) => (
              <field.MoneyInputField id="goal-current" label={t("goals.currentAmount")} />
            )}
          </form.Field>

          <form.Field name="targetDate">
            {(field) => <field.DateField id="goal-date" label={t("goals.targetDate")} />}
          </form.Field>
        </FormGrid>

        <FormError error={error} />

        <form.FormActions
          pending={pending}
          submitLabel={initial ? t("actions.save") : t("goals.add")}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
