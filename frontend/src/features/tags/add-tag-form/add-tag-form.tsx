import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateTag, useHouseholdsSuspense } from "@/api/generated";
import type { Scope } from "@/api/generated/model";
import { createTagBodyNameMax } from "@/api/schemas/tags/tags.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { SharingFields } from "@/components/sharing-fields/sharing-fields";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { silent } from "@/lib/mutations";
import { refineSharing, requiredText, sharedHouseholdId, sharingShape } from "@/lib/validation";
import { useSharingDefaults } from "@/stores/active-household-store";

interface FormValues {
  name: string;
  scope: Scope;
  householdId: string;
}

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

export function AddTagForm({ onCreated, onCancel }: Readonly<Props>) {
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

  const createMutation = useCreateTag(silent({ onSuccess: onCreated }));

  const defaultValues: FormValues = {
    name: "",
    scope: sharing.scope,
    householdId: sharing.householdId,
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) =>
      createMutation.mutateAsync({
        data: {
          name: value.name.trim(),
          scope: value.scope,
          householdId: sharedHouseholdId(value),
        },
      }),
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

        <FormError error={createMutation.error} />

        <form.FormActions
          pending={createMutation.isPending}
          submitLabel={t("actions.add")}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
