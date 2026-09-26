import { MailCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useForgotPassword } from "@/api/generated";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { silent } from "@/lib/mutations";
import { requiredEmail } from "@/lib/validation";
import { AuthCard, AuthNotice, BackToSignIn } from "../auth-card/auth-card";

interface FormValues {
  email: string;
}

export function ForgotPasswordPage() {
  const { t } = useTranslation();

  const askMutation = useForgotPassword(silent());

  const defaultValues: FormValues = { email: "" };

  const form = useServerForm({
    defaultValues,
    schema: z.object({ email: requiredEmail(t) }),
    submit: (value) => askMutation.mutateAsync({ data: { email: value.email.trim() } }),
  });

  return (
    <AuthCard title={t("auth.forgotTitle")} subtitle={t("auth.forgotSubtitle")}>
      {askMutation.isSuccess ? (
        <div className="mt-6 space-y-4">
          <AuthNotice icon={MailCheck}>{t("auth.forgotSent")}</AuthNotice>
          <BackToSignIn />
        </div>
      ) : (
        <form.AppForm>
          <form.FormShell className="mt-6 space-y-4">
            <form.Field name="email">
              {(field) => (
                <field.TextField
                  id="forgot-email"
                  label={t("auth.email")}
                  autoComplete="username"
                  type="email"
                  autoFocus
                />
              )}
            </form.Field>

            <FormError error={askMutation.error} />

            <form.SubmitButton pending={askMutation.isPending} className="w-full">
              {t("auth.sendResetLink")}
            </form.SubmitButton>

            <BackToSignIn />
          </form.FormShell>
        </form.AppForm>
      )}
    </AuthCard>
  );
}
