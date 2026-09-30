import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateTag, useHouseholdsSuspense, useUpdateTag } from "@/api/generated";
import type { Scope, TagResponse } from "@/api/generated/model";
import { createTagBodyNameMax } from "@/api/schemas/tags/tags.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { SharingFields } from "@/components/sharing-fields/sharing-fields";
import { silentMutation, upsert } from "@/lib/mutations";
import { refineSharing, requiredText, sharingPayload, sharingShape } from "@/lib/validation";
import { useSharingDefaults } from "@/stores/active-household-store";

interface FormValues {
  name: string;
  scope: Scope;
  householdId: string;
}

interface Props {
  initial?: TagResponse;
  onClose: () => void;
}

export function TagForm({ initial, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const sharing = useSharingDefaults(useHouseholdsSuspense().data, initial);

  const schema = refineSharing(
    z.object({
      name: requiredText(t, createTagBodyNameMax),
      ...sharingShape(),
    }),
    t,
  );

  const { create, update, pending, error } = upsert(
    useCreateTag({ mutation: { ...silentMutation, onSuccess: onClose } }),
    useUpdateTag({ mutation: { ...silentMutation, onSuccess: onClose } }),
  );

  const defaultValues: FormValues = {
    name: initial?.name ?? "",
    ...sharing,
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => {
      const data = {
        name: value.name.trim(),
        ...sharingPayload(value),
      };
      return initial ? update({ id: initial.id, data }) : create({ data });
    },
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <form.Field name="name">
          {(field) => (
            <field.TextField
              id="tag-name"
              label={t("tags.name")}
              placeholder={t("tags.namePlaceholder")}
              autoFocus
            />
          )}
        </form.Field>

        <SharingFields
          form={form}
          fields={{ scope: "scope", householdId: "householdId" }}
          idPrefix="tag"
          grid
        />

        <FormError error={error} />

        <form.FormActions
          pending={pending}
          submitLabel={initial ? t("actions.save") : t("actions.add")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
