import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateUser } from "@/api/generated";
import {
  createUserBodyDisplayNameMax,
  createUserBodyPasswordMax,
  createUserBodyPasswordMin,
} from "@/api/schemas/users/users.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { silent } from "@/lib/mutations";
import { password, requiredEmail, requiredText } from "@/lib/validation";

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
    email: requiredEmail(t),
    displayName: requiredText(t, createUserBodyDisplayNameMax),
    role: z.enum(roles),
    password: password(t, createUserBodyPasswordMin, createUserBodyPasswordMax),
  });

  const createMutation = useCreateUser(silent({ onSuccess: onCreated }));

  const defaultValues: FormValues = {
    email: "",
    displayName: "",
    role: "Member",
    password: "",
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) =>
      createMutation.mutateAsync({
        data: {
          email: value.email.trim(),
          displayName: value.displayName.trim(),
          role: value.role,
          password: value.password,
        },
      }),
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <FormGrid>
          <form.Field name="displayName">
            {(field) => (
              <field.TextField id="user-display-name" label={t("users.displayName")} autoFocus />
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => <field.TextField id="user-email" label={t("users.email")} type="email" />}
          </form.Field>
        </FormGrid>

        <FormGrid>
          <form.Field name="role">
            {(field) => (
              <field.SelectFieldControl
                id="user-role"
                label={t("users.role")}
                options={roles.map((role) => ({ value: role, label: t(`users.roles.${role}`) }))}
              />
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <field.TextField id="user-password" label={t("users.password")} type="password" />
            )}
          </form.Field>
        </FormGrid>

        <FormError error={createMutation.error} />

        <form.FormActions
          pending={createMutation.isPending}
          submitLabel={t("users.add")}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
