import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useLogin } from "@/api/generated";
import { Brand } from "@/components/brand/brand";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Card } from "@/components/ui/card/card";
import { usePublicSettings } from "@/hooks/use-settings";
import { setAuthenticated } from "@/lib/auth-gate";
import { requiredEmail, requiredValue } from "@/lib/validation";

interface FormValues {
  email: string;
  password: string;
  rememberMe: boolean;
  twoFactorCode: string;
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const emailEnabled = usePublicSettings()?.emailEnabled ?? false;
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);

  const schema = z.object({
    email: requiredEmail(t),
    password: requiredValue(t),
    rememberMe: z.boolean(),
    twoFactorCode: twoFactorRequired ? requiredValue(t) : z.string(),
  });

  const loginMutation = useLogin({
    mutation: {
      meta: { silent: true },
      onSuccess: (data) => {
        if (data.twoFactorRequired) {
          setTwoFactorRequired(true);
          return;
        }
        setAuthenticated(true);
        void navigate({ to: "/" });
      },
    },
  });

  const defaultValues: FormValues = {
    email: "",
    password: "",
    rememberMe: false,
    twoFactorCode: "",
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) =>
      loginMutation.mutateAsync({
        data: {
          email: value.email.trim(),
          password: value.password,
          rememberMe: value.rememberMe,
          twoFactorCode: value.twoFactorCode || null,
        },
      }),
  });

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex justify-center">
        <Brand size="lg" stacked />
      </div>
      <Card className="p-6 sm:p-8">
        <h1 className="text-lg font-semibold">{t("auth.signIn")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.signInSubtitle")}</p>

        <form.AppForm>
          <form.FormShell className="mt-6 space-y-4">
            <form.Field name="email">
              {(field) => (
                <field.TextField
                  id="login-email"
                  label={t("auth.email")}
                  autoComplete="username"
                  type="email"
                  autoFocus={!twoFactorRequired}
                  disabled={twoFactorRequired}
                />
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <field.TextField
                  id="login-password"
                  label={t("auth.password")}
                  autoComplete="current-password"
                  type="password"
                  disabled={twoFactorRequired}
                />
              )}
            </form.Field>

            {twoFactorRequired ? (
              <form.Field name="twoFactorCode">
                {(field) => (
                  <field.TextField
                    id="login-two-factor-code"
                    label={t("auth.twoFactorCode")}
                    hint={t("auth.twoFactorCodeHint")}
                    autoComplete="one-time-code"
                    autoFocus
                    inputMode="numeric"
                  />
                )}
              </form.Field>
            ) : (
              <form.Field name="rememberMe">
                {(field) => (
                  <field.CheckboxField
                    id="login-remember-me"
                    label={t("auth.rememberMe")}
                    tone="muted"
                  />
                )}
              </form.Field>
            )}

            <FormError error={loginMutation.error} />

            <form.SubmitButton pending={loginMutation.isPending} className="w-full">
              {twoFactorRequired ? t("auth.verifyCode") : t("auth.signIn")}
            </form.SubmitButton>

            {emailEnabled && !twoFactorRequired ? (
              <Link
                to="/forgot-password"
                className="inline-block text-sm font-medium text-muted-foreground underline"
              >
                {t("auth.forgotPassword")}
              </Link>
            ) : null}
          </form.FormShell>
        </form.AppForm>
      </Card>
    </div>
  );
}
