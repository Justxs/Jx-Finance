import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateCategoryEndpoint } from "@/api/generated";
import type { FlowType } from "@/api/generated/model";
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
}

interface Props {
  onCreated: () => void;
}

export function AddCategoryForm({ onCreated }: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, t("validation.required"))
      .max(100, t("validation.maxLength", { max: 100 })),
    type: z.enum(["income", "expense"]),
    icon: z.string().nullable(),
  });

  const createMutation = useCreateCategoryEndpoint({ mutation: { onSettled: onCreated } });

  const defaultValues: FormValues = { name: "", type: "expense", icon: null };

  const form = useForm({
    defaultValues,
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      createMutation.mutate({
        data: { name: value.name.trim(), type: value.type, icon: value.icon },
      });
      form.reset();
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
      <div className="grid gap-4 md:grid-cols-3 md:items-start">
        <form.Field name="name">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="category-name">{t("categories.name")}</Label>
              <Input
                id="category-name"
                placeholder={t("categories.namePlaceholder")}
                value={field.state.value}
                aria-invalid={field.state.meta.errors.length > 0}
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

        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button
              type="submit"
              disabled={createMutation.isPending || !canSubmit}
              className="md:mt-6"
            >
              {t("actions.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>

      <form.Field name="icon">
        {(field) => (
          <div className="space-y-1.5">
            <Label>{t("categories.icon")}</Label>
            <IconPicker value={field.state.value} onChange={field.handleChange} />
          </div>
        )}
      </form.Field>
    </form>
  );
}
