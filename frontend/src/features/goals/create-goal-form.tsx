import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateGoalEndpoint } from "@/api/generated";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isMoney, isPositiveMoney } from "@/lib/validation";

interface FormValues {
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
}

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateGoalForm({ onCreated, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, t("validation.required"))
      .max(100, t("validation.maxLength", { max: 100 })),
    targetAmount: z.string().refine(isPositiveMoney, t("validation.positiveMoney")),
    currentAmount: z.string().refine((v) => v === "" || isMoney(v), t("validation.money")),
    targetDate: z.string(),
  });

  const createMutation = useCreateGoalEndpoint({ mutation: { onSuccess: onCreated } });

  const defaultValues: FormValues = {
    name: "",
    targetAmount: "",
    currentAmount: "",
    targetDate: "",
  };

  const form = useForm({
    defaultValues,
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      createMutation.mutate({
        data: {
          name: value.name.trim(),
          targetAmount: value.targetAmount,
          currentAmount: value.currentAmount || null,
          targetDate: value.targetDate || null,
        },
      });
      form.reset();
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
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="name">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">{t("goals.name")}</Label>
              <Input
                id="goal-name"
                placeholder={t("goals.namePlaceholder")}
                value={field.state.value}
                aria-invalid={field.state.meta.errors.length > 0}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError message={field.state.meta.errors[0]?.message} />
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
                value={field.state.value}
                aria-invalid={field.state.meta.errors.length > 0}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError message={field.state.meta.errors[0]?.message} />
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
                value={field.state.value}
                aria-invalid={field.state.meta.errors.length > 0}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError message={field.state.meta.errors[0]?.message} />
            </div>
          )}
        </form.Field>

        <form.Field name="targetDate">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">{t("goals.targetDate")}</Label>
              <DatePicker
                id="goal-date"
                value={field.state.value}
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
            <Button type="submit" disabled={createMutation.isPending || !canSubmit}>
              {t("goals.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
