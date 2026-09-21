import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useHouseholdsSuspense, useUpdateTag } from "@/api/generated";
import type { Scope, TagResponse } from "@/api/generated/model";
import { updateTagBodyNameMax } from "@/api/schemas/tags/tags.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { SharingFields } from "@/components/sharing-fields/sharing-fields";
import { Button } from "@/components/ui/button/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input/input";
import { silent } from "@/lib/mutations";
import { refineSharing, requiredText, sharedHouseholdId, sharingShape } from "@/lib/validation";

interface FormValues {
  name: string;
  scope: Scope;
  householdId: string;
}

interface Props {
  tag: TagResponse;
  onSaved: () => void;
  onCancel: () => void;
}

export function TagEditForm({ tag, onSaved, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const households = useHouseholdsSuspense();
  const householdList = households.data ?? [];

  const schema = refineSharing(
    z.object({
      name: requiredText(t, updateTagBodyNameMax),
      ...sharingShape(),
    }),
    t,
  );

  const updateMutation = useUpdateTag(silent({ onSuccess: onSaved }));

  const form = useServerForm({
    defaultValues: {
      name: tag.name ?? "",
      scope: tag.scope ?? "personal",
      householdId: tag.householdId ?? "",
    } satisfies FormValues,
    schema,
    submit: (value) =>
      updateMutation.mutateAsync({
        id: tag.id,
        data: {
          name: value.name.trim(),
          scope: value.scope,
          householdId: sharedHouseholdId(value),
        },
      }),
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <form.Field name="name">
            {(field) => (
              <Input
                aria-label={t("tags.name")}
                className="w-full sm:w-auto sm:flex-1"
                value={field.value}
                aria-invalid={field.errors.length > 0}
                aria-describedby={field.errors.length > 0 ? `tag-${tag.id}-name-error` : undefined}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoFocus
              />
            )}
          </form.Field>
          <form.SubmitButton size="sm" pending={updateMutation.isPending}>
            {t("actions.save")}
          </form.SubmitButton>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
        </div>
        <form.Field name="name">
          {(field) => (
            <FieldError id={`tag-${tag.id}-name-error`} message={field.errors[0]?.message} />
          )}
        </form.Field>

        {householdList.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <SharingFields
              form={form}
              fields={{ scope: "scope", householdId: "householdId" }}
              idPrefix={`tag-${tag.id}`}
              households={householdList}
            />
          </div>
        ) : null}

        <FormError error={updateMutation.error} />
      </form.FormShell>
    </form.AppForm>
  );
}
