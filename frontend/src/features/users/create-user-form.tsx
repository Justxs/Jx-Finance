import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateUserEndpoint } from "@/api/generated";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const roles = ["Member", "Admin"] as const;

interface FormValues {
  email: string;
  displayName: string;
  role: (typeof roles)[number];
  password: string;
}

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateUserForm({ onCreated, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z.object({
    email: z
      .string()
      .trim()
      .min(1, t("validation.required"))
      .regex(/^[^\s@]+@[^\s@]+$/, t("validation.email")),
    displayName: z
      .string()
      .trim()
      .min(1, t("validation.required"))
      .max(100, t("validation.maxLength", { max: 100 })),
    role: z.enum(roles),
    password: z
      .string()
      .min(8, t("validation.minLength", { min: 8 }))
      .max(100),
  });

  const createMutation = useCreateUserEndpoint({ mutation: { onSuccess: onCreated } });

  const defaultValues: FormValues = {
    email: "",
    displayName: "",
    role: "Member",
    password: "",
  };

  const form = useForm({
    defaultValues,
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      createMutation.mutate({
        data: {
          email: value.email.trim(),
          displayName: value.displayName.trim(),
          role: value.role,
          password: value.password,
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
        <form.Field name="displayName">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="user-display-name">{t("users.displayName")}</Label>
              <Input
                id="user-display-name"
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

        <form.Field name="email">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="user-email">{t("users.email")}</Label>
              <Input
                id="user-email"
                type="email"
                value={field.state.value}
                aria-invalid={field.state.meta.errors.length > 0}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError message={field.state.meta.errors[0]?.message} />
            </div>
          )}
        </form.Field>
      </div>

      <div className="form-grid">
        <form.Field name="role">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="user-role">{t("users.role")}</Label>
              <Select
                id="user-role"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value as FormValues["role"])}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {t(`users.roles.${role}`)}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="user-password">{t("users.password")}</Label>
              <Input
                id="user-password"
                type="password"
                value={field.state.value}
                aria-invalid={field.state.meta.errors.length > 0}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError message={field.state.meta.errors[0]?.message} />
            </div>
          )}
        </form.Field>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" disabled={createMutation.isPending || !canSubmit}>
              {t("users.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
