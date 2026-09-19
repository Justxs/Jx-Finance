import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateCategory, useGetHouseholdsSuspense } from "@/api/generated";
import type { FlowType, Scope } from "@/api/generated/model";
import { createCategoryBodyNameMax } from "@/api/schemas/categories/categories.zod";
import { FormError } from "@/components/form-error";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const households = useGetHouseholdsSuspense();
  const householdList = households.data ?? [];

  const schema = z
    .object({
      name: z
        .string()
        .refine((value) => value.trim().length > 0, t("validation.required"))
        .refine(
          (value) => value.trim().length <= createCategoryBodyNameMax,
          t("validation.maxLength", { max: createCategoryBodyNameMax }),
        ),
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

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      createMutation.mutate({
        data: {
          name: value.name.trim(),
          type: value.type,
          icon: value.icon,
          scope: value.scope,
          householdId: value.scope === "shared" ? value.householdId : null,
        },
      });
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      noValidate
      className="space-y-4"
    >
      <div className="form-grid">
        <form.Field name="name">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="category-name">{t("categories.name")}</Label>
              <Input
                id="category-name"
                placeholder={t("categories.namePlaceholder")}
                value={field.value}
                aria-invalid={field.errors.length > 0}
                aria-describedby={field.errors.length > 0 ? "category-name-error" : undefined}
                autoFocus
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError id="category-name-error" message={field.errors[0]?.message} />
            </div>
          )}
        </form.Field>

        <form.Field name="type">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="category-type">{t("transactions.type")}</Label>
              <SelectField
                id="category-type"
                value={field.value}
                onBlur={field.handleBlur}
                onChange={(value) => field.handleChange(value)}
                options={[
                  { value: "expense", label: t("categories.expense") },
                  { value: "income", label: t("categories.income") },
                ]}
              />
            </div>
          )}
        </form.Field>
      </div>

      {householdList.length > 0 ? (
        <div className="form-grid">
          <form.Field name="scope">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="category-scope">{t("sharing.scope")}</Label>
                <SelectField
                  id="category-scope"
                  value={field.value}
                  onChange={(value) => field.handleChange(value)}
                  options={[
                    { value: "personal", label: t("sharing.personal") },
                    { value: "shared", label: t("sharing.shared") },
                  ]}
                />
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.scope}>
            {(scope) =>
              scope === "shared" ? (
                <form.Field name="householdId">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="category-household">{t("sharing.household")}</Label>
                      <SelectField
                        id="category-household"
                        value={field.value}
                        aria-invalid={field.errors.length > 0}
                        aria-describedby={
                          field.errors.length > 0 ? "category-household-error" : undefined
                        }
                        onBlur={field.handleBlur}
                        onChange={(value) => field.handleChange(value)}
                        options={[
                          { value: "", label: t("sharing.selectHousehold") },
                          ...householdList.map((household) => ({
                            value: household.id,
                            label: household.name,
                          })),
                        ]}
                      />
                      <FieldError
                        id="category-household-error"
                        message={field.errors[0]?.message}
                      />
                    </div>
                  )}
                </form.Field>
              ) : null
            }
          </form.Subscribe>
        </div>
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
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" pending={createMutation.isPending} disabled={!canSubmit}>
              {t("actions.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
