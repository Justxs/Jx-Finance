import { useState } from "react";
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
import { useAppForm } from "@/components/form";
import { FormError } from "@/components/form-error";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { hasServerErrorCode, submitToServer } from "@/lib/form-server-errors";
import { password, requiredValue } from "@/lib/validation";

interface FormProps {
  user: UserProfileResponse;
  onDone: () => void;
  onCancel: () => void;
}

interface Props {
  user: UserProfileResponse | null;
  onClose: () => void;
}

function userName(user: UserProfileResponse) {
  return user.displayName || user.email;
}

function ResetPasswordForm({ user, onDone, onCancel }: Readonly<FormProps>) {
  const { t } = useTranslation();
  const name = userName(user);

  const schema = z.object({
    newPassword: password(
      t,
      resetUserPasswordBodyNewPasswordMin,
      resetUserPasswordBodyNewPasswordMax,
    ),
    resetTwoFactor: z.boolean(),
    currentPassword: requiredValue(t).max(
      resetUserPasswordBodyCurrentPasswordMax,
      t("validation.maxLength", { max: resetUserPasswordBodyCurrentPasswordMax }),
    ),
  });

  const resetMutation = useResetUserPassword({
    mutation: {
      meta: { silent: true },
      onSuccess: () => {
        toast.success(t("users.resetPassword.done", { name }));
        onDone();
      },
    },
  });

  const form = useAppForm({
    defaultValues: { newPassword: "", resetTwoFactor: false, currentPassword: "" },
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) =>
      submitToServer(submission, async () => {
        try {
          await resetMutation.mutateAsync({ id: user.id, data: submission.value });
        } catch (failure) {
          if (hasServerErrorCode(failure, "password.incorrect")) {
            submission.formApi.setFieldValue("currentPassword", "");
          }
          throw failure;
        }
      }),
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

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={resetMutation.isPending}
            onClick={onCancel}
          >
            {t("actions.cancel")}
          </Button>
          <form.SubmitButton pending={resetMutation.isPending}>
            {t("users.resetPassword.submit")}
          </form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}

export function ResetPasswordDialog({ user, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [shownUser, setShownUser] = useState(user);

  if (user !== null && user !== shownUser) {
    setShownUser(user);
  }

  return (
    <Modal
      open={user !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={t("users.resetPassword.title")}
      description={shownUser ? userName(shownUser) : undefined}
    >
      {shownUser ? (
        <ResetPasswordForm
          key={shownUser.id}
          user={shownUser}
          onDone={onClose}
          onCancel={onClose}
        />
      ) : null}
    </Modal>
  );
}
