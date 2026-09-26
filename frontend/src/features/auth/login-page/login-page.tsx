import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useLogin } from "@/api/generated";
import type { LoginResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { useEmailEnabled } from "@/hooks/use-settings";
import { setAuthenticated } from "@/lib/auth-gate";
import { silent } from "@/lib/mutations";
import { requiredEmail, requiredValue } from "@/lib/validation";
import { AuthCard } from "../auth-card/auth-card";

interface FormValues {
  email: string;
  password: string;
  rememberMe: boolean;
  twoFactorCode: string;
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const emailEnabled = useEmailEnabled();
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);

  const schema = z.object({
    email: requiredEmail(t),
    password: requiredValue(t),
    rememberMe: z.boolean(),
    twoFactorCode: twoFactorRequired ? requiredValue(t) : z.string(),
  });

  const loginMutation = useLogin(
    silent({
      onSuccess: (data: LoginResponse) => {
        if (data.twoFactorRequired) {
          setTwoFactorRequired(true);
          return;
        }
        setAuthenticated(true);
        void navigate({ to: "/" });
      },
    }),
  );

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
    <AuthCard title={t("auth.signIn")} subtitle={t("auth.signInSubtitle")}>
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
    </AuthCard>
  );
}
