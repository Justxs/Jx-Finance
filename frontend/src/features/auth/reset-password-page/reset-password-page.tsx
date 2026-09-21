import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useResetPassword } from "@/api/generated";
import { resetPasswordBodyNewPasswordMin } from "@/api/schemas/auth/auth.zod";
import { Brand } from "@/components/brand/brand";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Card } from "@/components/ui/card/card";
import { silent } from "@/lib/mutations";

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
    <div className="w-full max-w-sm">
      <div className="mb-6 flex justify-center">
        <Brand size="lg" stacked />
      </div>
      <Card className="p-6 sm:p-8">
        <h1 className="text-lg font-semibold">{t("auth.resetTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {linkIsUsable ? t("auth.resetSubtitle") : t("auth.resetLinkBroken")}
        </p>

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

        <Link to="/login" className="mt-4 inline-block text-sm font-medium underline">
          {t("auth.backToSignIn")}
        </Link>
      </Card>
    </div>
  );
}
