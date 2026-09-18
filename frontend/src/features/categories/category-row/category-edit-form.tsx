import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useGetHouseholdsEndpointSuspense, useUpdateCategoryEndpoint } from "@/api/generated";
import type { CategoryResponse, Scope } from "@/api/generated/model";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconPicker } from "../icon-picker";

interface FormValues {
  name: string;
  icon: string | null;
  scope: Scope;
  householdId: string;
}

interface Props {
  category: CategoryResponse;
  onSaved: () => void;
  onCancel: () => void;
}

export function CategoryEditForm({ category, onSaved, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const households = useGetHouseholdsEndpointSuspense();
  const householdList = households.data ?? [];

  const schema = z
    .object({
      name: z
        .string()
        .trim()
        .min(1, t("validation.required"))
        .max(100, t("validation.maxLength", { max: 100 })),
      icon: z.string().nullable(),
      scope: z.enum(["personal", "shared"]),
      householdId: z.string(),
    })
    .refine((value) => value.scope !== "shared" || value.householdId !== "", {
      message: t("validation.required"),
      path: ["householdId"],
    });

  const updateMutation = useUpdateCategoryEndpoint({
    mutation: {
      onSuccess: onSaved,
    },
  });

  const form = useForm({
    defaultValues: {
      name: category.name ?? "",
      icon: category.icon ?? null,
      scope: category.scope ?? "personal",
      householdId: category.householdId ?? "",
    } satisfies FormValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      updateMutation.mutate({
        id: category.id!,
        data: {
          name: value.name.trim(),
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
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <form.Field name="name">
          {(field) => (
            <Input
              aria-label={t("categories.name")}
              className="w-full sm:w-auto sm:flex-1"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={
                field.errors.length > 0 ? `category-${category.id}-name-error` : undefined
              }
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              autoFocus
            />
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button
              type="submit"
              size="sm"
              pending={updateMutation.isPending}
              disabled={!canSubmit}
            >
              {t("actions.save")}
            </Button>
          )}
        </form.Subscribe>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
      </div>
      <form.Field name="name">
        {(field) => (
          <FieldError
            id={`category-${category.id}-name-error`}
            message={field.errors[0]?.message}
          />
        )}
      </form.Field>
      <form.Field name="icon">
        {(field) => <IconPicker value={field.value} onChange={field.handleChange} />}
      </form.Field>

      {householdList.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <form.Field name="scope">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={`category-${category.id}-scope`}>{t("sharing.scope")}</Label>
                <SelectField
                  id={`category-${category.id}-scope`}
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
                      <Label htmlFor={`category-${category.id}-household`}>
                        {t("sharing.household")}
                      </Label>
                      <SelectField
                        id={`category-${category.id}-household`}
                        value={field.value}
                        aria-invalid={field.errors.length > 0}
                        aria-describedby={
                          field.errors.length > 0
                            ? `category-${category.id}-household-error`
                            : undefined
                        }
                        onBlur={field.handleBlur}
                        onChange={(value) => field.handleChange(value)}
                        options={[
                          { value: "", label: t("sharing.selectHousehold") },
                          ...householdList.map((household) => ({
                            value: household.id!,
                            label: household.name,
                          })),
                        ]}
                      />
                      <FieldError
                        id={`category-${category.id}-household-error`}
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
    </form>
  );
}
