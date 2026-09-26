import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useResetUserPassword } from "@/api/generated";
import type { UserProfileResponse } from "@/api/generated/model";
import {
  resetUserPasswordBodyCurrentPasswordMax,
  resetUserPasswordBodyNewPasswordMax,
  resetUserPasswordBodyNewPasswordMin,
} from "@/api/schemas/users/users.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { EditModal } from "@/components/modal";
import { clearingWrongPassword } from "@/lib/form-server-errors";
import { silent } from "@/lib/mutations";
import { password, requiredMax } from "@/lib/validation";
import { userName } from "../user-queries";

interface FormProps {
  user: UserProfileResponse;
  onClose: () => void;
}

interface Props {
  user: UserProfileResponse | null;
  onClose: () => void;
}

function ResetPasswordForm({ user, onClose }: Readonly<FormProps>) {
  const { t } = useTranslation();
  const name = userName(user);

  const schema = z.object({
    newPassword: password(
      t,
      resetUserPasswordBodyNewPasswordMin,
      resetUserPasswordBodyNewPasswordMax,
    ),
    resetTwoFactor: z.boolean(),
    currentPassword: requiredMax(t, resetUserPasswordBodyCurrentPasswordMax),
  });

  const resetMutation = useResetUserPassword(
    silent({
      onSuccess: () => {
        toast.success(t("users.resetPassword.done", { name }));
        onClose();
      },
    }),
  );

  const form = useServerForm({
    defaultValues: { newPassword: "", resetTwoFactor: false, currentPassword: "" },
    schema,
    submit: (value, formApi) =>
      clearingWrongPassword(formApi, "currentPassword", () =>
        resetMutation.mutateAsync({ id: user.id, data: value }),
      ),
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("users.resetPassword.consequences", { name })}
        </p>

        <form.Field name="newPassword">
          {(field) => (
            <field.TextField
              id="reset-new-password"
              label={t("users.resetPassword.newPassword")}
              hint={t("users.resetPassword.newPasswordHint", {
                min: resetUserPasswordBodyNewPasswordMin,
                max: resetUserPasswordBodyNewPasswordMax,
              })}
              type="password"
              autoComplete="new-password"
              touchedOnly
              autoFocus
            />
          )}
        </form.Field>

        <form.Field name="resetTwoFactor">
          {(field) => (
            <field.CheckboxField
              id="reset-two-factor"
              label={t("users.resetPassword.resetTwoFactor")}
              hint={t("users.resetPassword.resetTwoFactorHint")}
            />
          )}
        </form.Field>

        <form.Field name="currentPassword">
          {(field) => (
            <field.TextField
              id="reset-current-password"
              label={t("users.resetPassword.currentPassword")}
              hint={t("users.resetPassword.currentPasswordHint")}
              type="password"
              autoComplete="current-password"
              touchedOnly
            />
          )}
        </form.Field>

        <FormError error={resetMutation.error} />

        <form.FormActions
          pending={resetMutation.isPending}
          cancelDisabled={resetMutation.isPending}
          submitLabel={t("users.resetPassword.submit")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}

export function ResetPasswordDialog({ user, onClose }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <EditModal
      item={user}
      title={t("users.resetPassword.title")}
      description={userName}
      onClose={onClose}
    >
      {(shown, close) => <ResetPasswordForm user={shown} onClose={close} />}
    </EditModal>
  );
}
