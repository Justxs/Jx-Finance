import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateHouseholdEndpoint } from "@/api/generated";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";

interface FormValues {
  name: string;
}

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateHouseholdForm({ onCreated, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, t("validation.required"))
      .max(100, t("validation.maxLength", { max: 100 })),
  });

  const createMutation = useCreateHouseholdEndpoint({ mutation: { onSuccess: onCreated } });

  const form = useForm({
    defaultValues: { name: "" } satisfies FormValues,
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      createMutation.mutate({ data: { name: value.name.trim() } });
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
      <form.Field name="name">
        {(field) => (
          <div className="space-y-1.5">
            <Input
              placeholder={t("households.namePlaceholder")}
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              autoFocus
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError message={field.state.meta.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" disabled={createMutation.isPending || !canSubmit}>
              {t("households.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
