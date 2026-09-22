import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateTag, useHouseholdsSuspense, useUpdateTag } from "@/api/generated";
import type { Scope, TagResponse } from "@/api/generated/model";
import { createTagBodyNameMax } from "@/api/schemas/tags/tags.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { SharingFields } from "@/components/sharing-fields/sharing-fields";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { silent, upsert } from "@/lib/mutations";
import { refineSharing, requiredText, sharedHouseholdId, sharingShape } from "@/lib/validation";
import { useSharingDefaults } from "@/stores/active-household-store";

interface FormValues {
  name: string;
  scope: Scope;
  householdId: string;
}

interface Props {
  initial?: TagResponse;
  onDone: () => void;
  onCancel: () => void;
}

export function TagForm({ initial, onDone, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const households = useHouseholdsSuspense();
  const householdList = households.data ?? [];
  const sharing = useSharingDefaults(householdList);

  const schema = refineSharing(
    z.object({
      name: requiredText(t, createTagBodyNameMax),
      ...sharingShape(),
    }),
    t,
  );

  const { create, update, pending, error } = upsert(
    useCreateTag(silent({ onSuccess: onDone })),
    useUpdateTag(silent({ onSuccess: onDone })),
  );

  const defaultValues: FormValues = {
    name: initial?.name ?? "",
    scope: initial?.scope ?? sharing.scope,
    householdId: initial ? (initial.householdId ?? "") : sharing.householdId,
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => {
      const data = {
        name: value.name.trim(),
        scope: value.scope,
        householdId: sharedHouseholdId(value),
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

        {householdList.length > 0 ? (
          <FormGrid>
            <SharingFields
              form={form}
              fields={{ scope: "scope", householdId: "householdId" }}
              idPrefix="tag"
              households={householdList}
            />
          </FormGrid>
        ) : null}

        <FormError error={error} />

        <form.FormActions
          pending={pending}
          submitLabel={initial ? t("actions.save") : t("actions.add")}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
