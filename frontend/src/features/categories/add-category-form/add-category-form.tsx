import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateCategory, useHouseholdsSuspense } from "@/api/generated";
import type { FlowType, Scope } from "@/api/generated/model";
import { createCategoryBodyNameMax } from "@/api/schemas/categories/categories.zod";
import { useAppForm } from "@/components/form";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { FormGrid } from "@/components/ui/form-grid";
import { Label } from "@/components/ui/label";
import { submitToServer } from "@/lib/form-server-errors";
import { requiredText } from "@/lib/validation";
import { IconPicker } from "../icon-picker";

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

  const schema = z
    .object({
      name: requiredText(t, createCategoryBodyNameMax),
      type: z.enum(["income", "expense"]),
      icon: z.string().nullable(),
      scope: z.enum(["personal", "shared"]),
      householdId: z.string(),
    })
    .refine((value) => value.scope !== "shared" || value.householdId !== "", {
      message: t("validation.required"),
      path: ["householdId"],
    });

  const createMutation = useCreateCategory({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });

  const defaultValues: FormValues = {
    name: "",
    type: "expense",
    icon: null,
    scope: "personal",
    householdId: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) => {
      const { value } = submission;

      return submitToServer(submission, () =>
        createMutation.mutateAsync({
          data: {
            name: value.name.trim(),
            type: value.type,
            icon: value.icon,
            scope: value.scope,
            householdId: value.scope === "shared" ? value.householdId : null,
          },
        }),
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
            <form.Field name="scope">
              {(field) => (
                <field.SelectFieldControl
                  id="category-scope"
                  label={t("sharing.scope")}
                  options={[
                    { value: "personal", label: t("sharing.personal") },
                    { value: "shared", label: t("sharing.shared") },
                  ]}
                />
              )}
            </form.Field>

            <form.Subscribe selector={(state) => state.values.scope}>
              {(scope) =>
                scope === "shared" ? (
                  <form.Field name="householdId">
                    {(field) => (
                      <field.SelectFieldControl
                        id="category-household"
                        label={t("sharing.household")}
                        options={[
                          { value: "", label: t("sharing.selectHousehold") },
                          ...householdList.map((household) => ({
                            value: household.id,
                            label: household.name,
                          })),
                        ]}
                      />
                    )}
                  </form.Field>
                ) : null
              }
            </form.Subscribe>
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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
          <form.SubmitButton pending={createMutation.isPending}>
            {t("actions.add")}
          </form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}
