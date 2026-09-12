import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateCategoryEndpoint, useGetHouseholdsEndpoint } from "@/api/generated";
import type { FlowType, Scope } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { IconPicker } from "./icon-picker";

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
  const households = useGetHouseholdsEndpoint();
  const householdList = households.data ?? [];

  const schema = z
    .object({
      name: z
        .string()
        .trim()
        .min(1, t("validation.required"))
        .max(100, t("validation.maxLength", { max: 100 })),
      type: z.enum(["income", "expense"]),
      icon: z.string().nullable(),
      scope: z.enum(["personal", "shared"]),
      householdId: z.string(),
    })
    .refine((value) => value.scope !== "shared" || value.householdId !== "", {
      message: t("validation.required"),
      path: ["householdId"],
    });

  const createMutation = useCreateCategoryEndpoint({ mutation: { onSuccess: onCreated } });

  const defaultValues: FormValues = {
    name: "",
    type: "expense",
    icon: null,
    scope: "personal",
    householdId: "",
  };

  const form = useForm({
    defaultValues,
    validators: { onChange: schema },
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
                value={field.state.value}
                aria-invalid={field.state.meta.errors.length > 0}
                autoFocus
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError message={field.state.meta.errors[0]?.message} />
            </div>
          )}
        </form.Field>

        <form.Field name="type">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="category-type">{t("transactions.type")}</Label>
              <Select
                id="category-type"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value as FlowType)}
              >
                <option value="expense">{t("categories.expense")}</option>
                <option value="income">{t("categories.income")}</option>
              </Select>
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
                <Select
                  id="category-scope"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value as FormValues["scope"])}
                >
                  <option value="personal">{t("sharing.personal")}</option>
                  <option value="shared">{t("sharing.shared")}</option>
                </Select>
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
                      <Select
                        id="category-household"
                        value={field.state.value}
                        aria-invalid={field.state.meta.errors.length > 0}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      >
                        <option value="">{t("sharing.selectHousehold")}</option>
                        {householdList.map((household) => (
                          <option key={household.id} value={household.id}>
                            {household.name}
                          </option>
                        ))}
                      </Select>
                      <FieldError message={field.state.meta.errors[0]?.message} />
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
            <IconPicker value={field.state.value} onChange={field.handleChange} />
          </div>
        )}
      </form.Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" disabled={createMutation.isPending || !canSubmit}>
              {t("actions.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
