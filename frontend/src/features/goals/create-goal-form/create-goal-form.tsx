import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateGoal, useUpdateGoal } from "@/api/generated";
import type { GoalResponse } from "@/api/generated/model";
import { createGoalBodyNameMax } from "@/api/schemas/goals/goals.zod";
import { useAppForm } from "@/components/form";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { FormGrid } from "@/components/ui/form-grid";
import { submitToServer } from "@/lib/form-server-errors";
import { isNonNegativeMoney, positiveMoney, requiredText } from "@/lib/validation";

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

function isCurrentAmount(value: string) {
  return value === "" || isNonNegativeMoney(value);
}

export function CreateGoalForm({ initial, onCreated, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z.object({
    name: requiredText(t, createGoalBodyNameMax),
    targetAmount: positiveMoney(t),
    currentAmount: z.string().refine(isCurrentAmount, t("validation.money")),
    targetDate: z.string(),
  });

  const createMutation = useCreateGoal({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });
  const updateMutation = useUpdateGoal({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });

  const defaultValues: FormValues = {
    name: initial?.name ?? "",
    targetAmount: initial?.targetAmount ?? "",
    currentAmount: initial?.currentAmount ?? "",
    targetDate: initial?.targetDate ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) => {
      const { value } = submission;
      const name = value.name.trim();
      const targetDate = value.targetDate || null;

      return submitToServer(submission, () =>
        initial?.id
          ? updateMutation.mutateAsync({
              id: initial.id,
              data: {
                name,
                targetAmount: value.targetAmount,
                currentAmount: value.currentAmount || "0",
                targetDate,
              },
            })
          : createMutation.mutateAsync({
              data: {
                name,
                targetAmount: value.targetAmount,
                currentAmount: value.currentAmount || null,
                targetDate,
              },
            }),
      );
    },
  });

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

        <FormError error={createMutation.error ?? updateMutation.error} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
          <form.SubmitButton pending={createMutation.isPending || updateMutation.isPending}>
            {initial ? t("actions.save") : t("goals.add")}
          </form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}
