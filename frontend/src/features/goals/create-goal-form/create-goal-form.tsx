import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateGoalEndpoint, useUpdateGoalEndpoint } from "@/api/generated";
import type { GoalResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isNonNegativeMoney, isPositiveMoney } from "@/lib/validation";

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
    name: z
      .string()
      .refine((value) => value.trim().length > 0, t("validation.required"))
      .refine((value) => value.trim().length <= 100, t("validation.maxLength", { max: 100 })),
    targetAmount: z.string().refine(isPositiveMoney, t("validation.positiveMoney")),
    currentAmount: z.string().refine(isCurrentAmount, t("validation.money")),
    targetDate: z.string(),
  });

  const createMutation = useCreateGoalEndpoint({ mutation: { onSuccess: onCreated } });
  const updateMutation = useUpdateGoalEndpoint({ mutation: { onSuccess: onCreated } });

  const defaultValues: FormValues = {
    name: initial?.name ?? "",
    targetAmount: initial?.targetAmount ?? "",
    currentAmount: initial?.currentAmount ?? "",
    targetDate: initial?.targetDate ?? "",
  };

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      const name = value.name.trim();
      const targetDate = value.targetDate || null;
      if (initial?.id) {
        updateMutation.mutate({
          id: initial.id,
          data: {
            name,
            targetAmount: value.targetAmount,
            currentAmount: value.currentAmount || "0",
            targetDate,
          },
        });
      } else {
        createMutation.mutate({
          data: {
            name,
            targetAmount: value.targetAmount,
            currentAmount: value.currentAmount || null,
            targetDate,
          },
        });
      }
    },
  });

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
        <form.Field name="name">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">{t("goals.name")}</Label>
              <Input
                id="goal-name"
                placeholder={t("goals.namePlaceholder")}
                value={field.value}
                aria-invalid={field.errors.length > 0}
                aria-describedby={field.errors.length > 0 ? "goal-name-error" : undefined}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError id="goal-name-error" message={field.errors[0]?.message} />
            </div>
          )}
        </form.Field>

        <form.Field name="targetAmount">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">{t("goals.targetAmount")}</Label>
              <Input
                id="goal-target"
                inputMode="decimal"
                placeholder="0.00"
                value={field.value}
                aria-invalid={field.errors.length > 0}
                aria-describedby={field.errors.length > 0 ? "goal-target-error" : undefined}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError id="goal-target-error" message={field.errors[0]?.message} />
            </div>
          )}
        </form.Field>

        <form.Field name="currentAmount">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="goal-current">{t("goals.currentAmount")}</Label>
              <Input
                id="goal-current"
                inputMode="decimal"
                placeholder="0.00"
                value={field.value}
                aria-invalid={field.errors.length > 0}
                aria-describedby={field.errors.length > 0 ? "goal-current-error" : undefined}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError id="goal-current-error" message={field.errors[0]?.message} />
            </div>
          )}
        </form.Field>

        <form.Field name="targetDate">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">{t("goals.targetDate")}</Label>
              <DatePicker
                id="goal-date"
                value={field.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
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
              {initial ? t("actions.save") : t("goals.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
