import { Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useForgotPassword } from "@/api/generated";
import { Brand } from "@/components/brand/brand";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Card } from "@/components/ui/card/card";
import { silent } from "@/lib/mutations";
import { requiredEmail } from "@/lib/validation";

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
    <div className="w-full max-w-sm">
      <div className="mb-6 flex justify-center">
        <Brand size="lg" stacked />
      </div>
      <Card className="p-6 sm:p-8">
        <h1 className="text-lg font-semibold">{t("auth.forgotTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.forgotSubtitle")}</p>

        {askMutation.isSuccess ? (
          <div className="mt-6 space-y-4">
            <p className="flex gap-3 rounded-md bg-background px-4 py-3 text-sm" role="status">
              <MailCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              {t("auth.forgotSent")}
            </p>
            <Link to="/login" className="inline-block text-sm font-medium underline">
              {t("auth.backToSignIn")}
            </Link>
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

              <Link to="/login" className="inline-block text-sm font-medium underline">
                {t("auth.backToSignIn")}
              </Link>
            </form.FormShell>
          </form.AppForm>
        )}
      </Card>
    </div>
  );
}
