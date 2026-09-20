import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateCategory, useHouseholdsSuspense } from "@/api/generated";
import type { FlowType, Scope } from "@/api/generated/model";
import { createCategoryBodyNameMax } from "@/api/schemas/categories/categories.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { SharingFields } from "@/components/sharing-fields/sharing-fields";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { Label } from "@/components/ui/label/label";
import { silent } from "@/lib/mutations";
import { refineSharing, requiredText, sharedHouseholdId, sharingShape } from "@/lib/validation";
import { IconPicker } from "../icon-picker/icon-picker";

interface FormValues {
  name: string;
  type: FlowType;
  icon: string | null;
  scope: Scope;
  householdId: string;
}

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

export function AddCategoryForm({ onCreated, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const households = useHouseholdsSuspense();
  const householdList = households.data ?? [];

  const schema = refineSharing(
    z.object({
      name: requiredText(t, createCategoryBodyNameMax),
      type: z.enum(["income", "expense"]),
      icon: z.string().nullable(),
      ...sharingShape(),
    }),
    t,
  );

  const createMutation = useCreateCategory(silent({ onSuccess: onCreated }));

  const defaultValues: FormValues = {
    name: "",
    type: "expense",
    icon: null,
    scope: "personal",
    householdId: "",
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) =>
      createMutation.mutateAsync({
        data: {
          name: value.name.trim(),
          type: value.type,
          icon: value.icon,
          scope: value.scope,
          householdId: sharedHouseholdId(value),
        },
      }),
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <FormGrid>
          <form.Field name="name">
            {(field) => (
              <field.TextField
                id="category-name"
                label={t("categories.name")}
                placeholder={t("categories.namePlaceholder")}
                autoFocus
              />
            )}
          </form.Field>

          <form.Field name="type">
            {(field) => (
              <field.SelectFieldControl
                id="category-type"
                label={t("transactions.type")}
                options={[
                  { value: "expense", label: t("categories.expense") },
                  { value: "income", label: t("categories.income") },
                ]}
              />
            )}
          </form.Field>
        </FormGrid>

        {householdList.length > 0 ? (
          <FormGrid>
            <SharingFields
              form={form}
              fields={{ scope: "scope", householdId: "householdId" }}
              idPrefix="category"
              households={householdList}
            />
          </FormGrid>
        ) : null}

        <form.Field name="icon">
          {(field) => (
            <div className="space-y-1.5">
              <Label>{t("categories.icon")}</Label>
              <IconPicker value={field.value} onChange={field.handleChange} />
            </div>
          )}
        </form.Field>

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
