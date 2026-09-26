import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useResetPassword } from "@/api/generated";
import { resetPasswordBodyNewPasswordMin } from "@/api/schemas/auth/auth.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { silent } from "@/lib/mutations";
import { AuthCard, BackToSignIn } from "../auth-card/auth-card";

interface FormValues {
  newPassword: string;
}

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { email, token } = useSearch({ from: "/reset-password" });

  const resetMutation = useResetPassword(
    silent({
      onSuccess: () => {
        toast.success(t("auth.resetDone"));
        void navigate({ to: "/login" });
      },
    }),
  );

  const schema = z.object({
    newPassword: z
      .string()
      .min(
        resetPasswordBodyNewPasswordMin,
        t("validation.minLength", { min: resetPasswordBodyNewPasswordMin }),
      ),
  });

  const defaultValues: FormValues = { newPassword: "" };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) =>
      resetMutation.mutateAsync({
        data: { email: email ?? "", token: token ?? "", newPassword: value.newPassword },
      }),
  });

  const linkIsUsable = Boolean(email && token);

  return (
    <AuthCard
      title={t("auth.resetTitle")}
      subtitle={linkIsUsable ? t("auth.resetSubtitle") : t("auth.resetLinkBroken")}
    >
      {linkIsUsable ? (
        <form.AppForm>
          <form.FormShell className="mt-6 space-y-4">
            <p className="text-sm">
              <span className="text-muted-foreground">{t("auth.email")}</span>{" "}
              <span className="font-medium">{email}</span>
            </p>

            <form.Field name="newPassword">
              {(field) => (
                <field.TextField
                  id="reset-new-password"
                  label={t("auth.newPassword")}
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                />
              )}
            </form.Field>

            <FormError error={resetMutation.error} />

            <form.SubmitButton pending={resetMutation.isPending} className="w-full">
              {t("auth.setNewPassword")}
            </form.SubmitButton>
          </form.FormShell>
        </form.AppForm>
      ) : null}

      <BackToSignIn className="mt-4" />
    </AuthCard>
  );
}
