import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateUser } from "@/api/generated";
import {
  createUserBodyDisplayNameMax,
  createUserBodyPasswordMax,
  createUserBodyPasswordMin,
} from "@/api/schemas/users/users.zod";
import { FormError } from "@/components/form-error";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isEmail } from "@/lib/validation";

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
      .refine((value) => value.trim().length > 0, t("validation.required"))
      .refine((value) => isEmail(value.trim()), t("validation.email")),
    displayName: z
      .string()
      .refine((value) => value.trim().length > 0, t("validation.required"))
      .refine(
        (value) => value.trim().length <= createUserBodyDisplayNameMax,
        t("validation.maxLength", { max: createUserBodyDisplayNameMax }),
      ),
    role: z.enum(roles),
    password: z
      .string()
      .min(createUserBodyPasswordMin, t("validation.minLength", { min: createUserBodyPasswordMin }))
      .max(
        createUserBodyPasswordMax,
        t("validation.maxLength", { max: createUserBodyPasswordMax }),
      ),
  });

  const createMutation = useCreateUser({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });

  const defaultValues: FormValues = {
    email: "",
    displayName: "",
    role: "Member",
    password: "",
  };

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
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
                value={field.value}
                aria-invalid={field.errors.length > 0}
                aria-describedby={field.errors.length > 0 ? "user-display-name-error" : undefined}
                autoFocus
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError id="user-display-name-error" message={field.errors[0]?.message} />
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
                value={field.value}
                aria-invalid={field.errors.length > 0}
                aria-describedby={field.errors.length > 0 ? "user-email-error" : undefined}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError id="user-email-error" message={field.errors[0]?.message} />
            </div>
          )}
        </form.Field>
      </div>

      <div className="form-grid">
        <form.Field name="role">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="user-role">{t("users.role")}</Label>
              <SelectField
                id="user-role"
                value={field.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                options={roles.map((role) => ({ value: role, label: t(`users.roles.${role}`) }))}
              />
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
                value={field.value}
                aria-invalid={field.errors.length > 0}
                aria-describedby={field.errors.length > 0 ? "user-password-error" : undefined}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError id="user-password-error" message={field.errors[0]?.message} />
            </div>
          )}
        </form.Field>
      </div>

      <FormError error={createMutation.error} />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" pending={createMutation.isPending} disabled={!canSubmit}>
              {t("users.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
