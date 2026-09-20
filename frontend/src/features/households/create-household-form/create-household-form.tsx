import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateHousehold, useUpdateHousehold } from "@/api/generated";
import type { HouseholdResponse } from "@/api/generated/model";
import { createHouseholdBodyNameMax } from "@/api/schemas/households/households.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { silent, upsert } from "@/lib/mutations";
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

  const { create, update, pending, error } = upsert(
    useCreateHousehold(silent({ onSuccess: onCreated })),
    useUpdateHousehold(silent({ onSuccess: onCreated })),
  );

  const form = useServerForm({
    defaultValues: { name: initial?.name ?? "" } satisfies FormValues,
    schema,
    submit: (value) => {
      const data = { name: value.name.trim() };

      return initial ? update({ id: initial.id, data }) : create({ data });
    },
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
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

        <FormError error={error} />

        <form.FormActions
          pending={pending}
          submitLabel={initial ? t("actions.save") : t("households.add")}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
