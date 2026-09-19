import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateHousehold, useUpdateHousehold } from "@/api/generated";
import type { HouseholdResponse } from "@/api/generated/model";
import { createHouseholdBodyNameMax } from "@/api/schemas/households/households.zod";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";

interface FormValues {
  name: string;
}

interface Props {
  initial?: HouseholdResponse;
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateHouseholdForm({ initial, onCreated, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z.object({
    name: z
      .string()
      .refine((value) => value.trim().length > 0, t("validation.required"))
      .refine(
        (value) => value.trim().length <= createHouseholdBodyNameMax,
        t("validation.maxLength", { max: createHouseholdBodyNameMax }),
      ),
  });

  const createMutation = useCreateHousehold({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });
  const updateMutation = useUpdateHousehold({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });
  const pending = createMutation.isPending || updateMutation.isPending;

  const form = useForm({
    defaultValues: { name: initial?.name ?? "" } satisfies FormValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      const data = { name: value.name.trim() };
      if (initial) {
        updateMutation.mutate({ id: initial.id, data });
        return;
      }
      createMutation.mutate({ data });
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
              aria-label={t("households.name")}
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

      <FormError error={createMutation.error ?? updateMutation.error} />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" pending={pending} disabled={!canSubmit}>
              {initial ? t("actions.save") : t("households.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
