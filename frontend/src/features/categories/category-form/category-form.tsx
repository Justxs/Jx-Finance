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
import { IconPicker } from "@/features/categories/icon-picker/icon-picker";
import { silentMutation, upsert } from "@/lib/mutations";
import { namedOptions, optionsOf } from "@/lib/options";
import { refineSharing, requiredText, sharingPayload, sharingShape } from "@/lib/validation";
import { useSharingDefaults } from "@/stores/active-household-store";

interface FormValues {
  name: string;
  type: FlowType;
  icon: string | null;
  parentId: string;
  scope: Scope;
  householdId: string;
}

interface Props {
  categories: readonly CategoryResponse[];
  initial?: CategoryResponse;
  onClose: () => void;
}

export function CategoryForm({ categories, initial, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const sharing = useSharingDefaults(useHouseholdsSuspense().data, initial);

  const schema = refineSharing(
    z.object({
      name: requiredText(t, createCategoryBodyNameMax),
      type: z.enum(FlowType),
      icon: z.string().nullable(),
      parentId: z.string(),
      ...sharingShape(),
    }),
    t,
  );

  const { create, update, pending, error } = upsert(
    useCreateCategory({ mutation: { ...silentMutation, onSuccess: onClose } }),
    useUpdateCategory({ mutation: { ...silentMutation, onSuccess: onClose } }),
  );

  const defaultValues: FormValues = {
    name: initial?.name ?? "",
    type: initial?.type ?? "expense",
    icon: initial?.icon ?? null,
    parentId: initial?.parentId ?? "",
    ...sharing,
  };
  const hasChildren = initial !== undefined && categories.some((c) => c.parentId === initial.id);

  function parentOptions(type: FlowType) {
    const parents = categories.filter(
      (c) => c.type === type && !c.parentId && c.id !== initial?.id,
    );
    return namedOptions(parents, t("categories.noParent"));
  }

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => {
      const data = {
        name: value.name.trim(),
        icon: value.icon,
        parentId: value.parentId || null,
        ...sharingPayload(value),
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
                  kind="segments"
                  label={t("transactions.type")}
                  options={optionsOf(["expense", "income"] as const, (type) =>
                    t(`categories.${type}`),
                  )}
                  onValueChange={() => form.setFieldValue("parentId", "")}
                />
              )}
            </form.Field>
          )}
          {hasChildren ? null : (
            <form.Subscribe selector={(state) => state.values.type}>
              {(type) => (
                <form.Field name="parentId">
                  {(field) => (
                    <field.SelectFieldControl
                      id="category-parent"
                      kind="search"
                      label={t("categories.parent")}
                      hint={t("categories.parentHint")}
                      options={parentOptions(type)}
                    />
                  )}
                </form.Field>
              )}
            </form.Subscribe>
          )}
        </FormGrid>

        <SharingFields
          form={form}
          fields={{ scope: "scope", householdId: "householdId" }}
          idPrefix="category"
          record={initial}
          grid
        />

        <form.Field name="icon">
          {(field) => (
            <div className="space-y-1.5">
              <Label id="category-icon-label">{t("categories.icon")}</Label>
              <IconPicker
                aria-labelledby="category-icon-label"
                value={field.value}
                onChange={field.handleChange}
              />
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
