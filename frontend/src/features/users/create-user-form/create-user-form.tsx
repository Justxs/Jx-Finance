import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateUser } from "@/api/generated";
import {
  createUserBodyDisplayNameMax,
  createUserBodyPasswordMax,
  createUserBodyPasswordMin,
} from "@/api/schemas/users/users.zod";
import { useAppForm } from "@/components/form";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { FormGrid } from "@/components/ui/form-grid";
import { submitToServer } from "@/lib/form-server-errors";
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

  const createMutation = useCreateUser({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });

  const defaultValues: FormValues = {
    email: "",
    displayName: "",
    role: "Member",
    password: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) => {
      const { value } = submission;

      return submitToServer(submission, () =>
        createMutation.mutateAsync({
          data: {
            email: value.email.trim(),
            displayName: value.displayName.trim(),
            role: value.role,
            password: value.password,
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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
          <form.SubmitButton pending={createMutation.isPending}>{t("users.add")}</form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}
