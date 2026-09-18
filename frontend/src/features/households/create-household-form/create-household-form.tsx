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
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      createMutation.mutate({ data: { name: value.name.trim() } });
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
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "household-name-error" : undefined}
              autoFocus
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError id="household-name-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" pending={createMutation.isPending} disabled={!canSubmit}>
              {t("households.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
