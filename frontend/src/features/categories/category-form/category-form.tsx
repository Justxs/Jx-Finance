import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateCategory, useHouseholdsSuspense, useUpdateCategory } from "@/api/generated";
import { type CategoryResponse, FlowType, type Scope } from "@/api/generated/model";
import { createCategoryBodyNameMax } from "@/api/schemas/categories/categories.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { SharingFields } from "@/components/sharing-fields/sharing-fields";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { Label } from "@/components/ui/label/label";
import { silent, upsert } from "@/lib/mutations";
import { refineSharing, requiredText, sharedHouseholdId, sharingShape } from "@/lib/validation";
import { useSharingDefaults } from "@/stores/active-household-store";
import { IconPicker } from "../icon-picker/icon-picker";

interface FormValues {
  name: string;
  type: FlowType;
  icon: string | null;
  scope: Scope;
  householdId: string;
}

interface Props {
  initial?: CategoryResponse;
  onClose: () => void;
}

export function CategoryForm({ initial, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const households = useHouseholdsSuspense();
  const householdList = households.data;
  const sharing = useSharingDefaults(householdList);

  const schema = refineSharing(
    z.object({
      name: requiredText(t, createCategoryBodyNameMax),
      type: z.enum(FlowType),
      icon: z.string().nullable(),
      ...sharingShape(),
    }),
    t,
  );

  const { create, update, pending, error } = upsert(
    useCreateCategory(silent({ onSuccess: onClose })),
    useUpdateCategory(silent({ onSuccess: onClose })),
  );

  const defaultValues: FormValues = {
    name: initial?.name ?? "",
    type: initial?.type ?? "expense",
    icon: initial?.icon ?? null,
    scope: initial?.scope ?? sharing.scope,
    householdId: initial ? (initial.householdId ?? "") : sharing.householdId,
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => {
      const data = {
        name: value.name.trim(),
        icon: value.icon,
        scope: value.scope,
        householdId: sharedHouseholdId(value),
      };
      return initial
        ? update({ id: initial.id, data })
        : create({ data: { ...data, type: value.type } });
    },
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

          {initial ? null : (
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
          )}
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
