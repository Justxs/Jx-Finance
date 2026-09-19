import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateHousehold, useUpdateHousehold } from "@/api/generated";
import type { HouseholdResponse } from "@/api/generated/model";
import { createHouseholdBodyNameMax } from "@/api/schemas/households/households.zod";
import { useAppForm } from "@/components/form";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { submitToServer } from "@/lib/form-server-errors";
import { requiredText } from "@/lib/validation";

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
    name: requiredText(t, createHouseholdBodyNameMax),
  });

  const createMutation = useCreateHousehold({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });
  const updateMutation = useUpdateHousehold({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });
  const pending = createMutation.isPending || updateMutation.isPending;

  const form = useAppForm({
    defaultValues: { name: initial?.name ?? "" } satisfies FormValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) => {
      const data = { name: submission.value.name.trim() };

      return submitToServer(submission, () =>
        initial
          ? updateMutation.mutateAsync({ id: initial.id, data })
          : createMutation.mutateAsync({ data }),
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
        <form.Field name="name">
          {(field) => (
            <field.TextField
              id="household-name"
              aria-label={t("households.name")}
              placeholder={t("households.namePlaceholder")}
              autoFocus
            />
          )}
        </form.Field>

        <FormError error={createMutation.error ?? updateMutation.error} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
          <form.SubmitButton pending={pending}>
            {initial ? t("actions.save") : t("households.add")}
          </form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}
