import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useBeginPasskeySignIn, useLogin, usePasskeySignIn } from "@/api/generated";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { AuthCard } from "@/features/auth/auth-card/auth-card";
import { useEmailEnabled, usePasskeysAvailable } from "@/hooks/use-settings";
import { loadAppShell } from "@/lib/app-shell";
import { setAuthenticated } from "@/lib/auth-gate";
import { silentMutation } from "@/lib/mutations";
import { type PasskeyFailure, getPasskey, passkeysSupported } from "@/lib/passkeys";
import { requiredEmail, requiredValue } from "@/lib/validation";

interface FormValues {
  email: string;
  password: string;
  rememberMe: boolean;
  twoFactorCode: string;
}

interface PasskeySignInProps {
  label: string;
  rememberMe: () => boolean;
  onSignedIn: () => Promise<void>;
}

function PasskeySignIn({ label, rememberMe, onSignedIn }: Readonly<PasskeySignInProps>) {
  const { t } = useTranslation();
  const [failure, setFailure] = useState<PasskeyFailure | null>(null);
  const begin = useBeginPasskeySignIn({ mutation: silentMutation });
  const signIn = usePasskeySignIn({ mutation: { ...silentMutation, onSuccess: onSignedIn } });

  function start() {
    setFailure(null);
    signIn.reset();
    begin.mutate(undefined, {
      onSuccess: async ({ optionsJson }) => {
        const asserted = await getPasskey(optionsJson);
        if (asserted.ok) {
          signIn.mutate({
            data: { credentialJson: asserted.credentialJson, rememberMe: rememberMe() },
          });
        } else {
          setFailure(asserted.reason);
        }
      },
    });
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        pending={begin.isPending || signIn.isPending}
        onClick={start}
      >
        {label}
      </Button>
      <FormError
        error={begin.error ?? signIn.error}
        message={failure && failure !== "cancelled" ? t("auth.passkeyFailed") : undefined}
      />
    </div>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const emailEnabled = useEmailEnabled();
  const passkeysOffered = usePasskeysAvailable() && passkeysSupported();
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);

  async function enterApp() {
    setAuthenticated(true);
    await Promise.allSettled([loadAppShell(queryClient), router.preloadRoute({ to: "/" })]);
    void navigate({ to: "/" });
  }

  const schema = z.object({
    email: requiredEmail(t),
    password: requiredValue(t),
    rememberMe: z.boolean(),
    twoFactorCode: twoFactorRequired ? requiredValue(t) : z.string(),
  });

  const loginMutation = useLogin({
    mutation: {
      ...silentMutation,
      onSuccess: async (data) => {
        if (data.twoFactorRequired) {
          setTwoFactorRequired(true);
          return;
        }
        await enterApp();
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
      {passkeysOffered ? (
        <div className="mt-4">
          <PasskeySignIn
            label={twoFactorRequired ? t("auth.usePasskeyInstead") : t("auth.signInWithPasskey")}
            rememberMe={() => form.getFieldValue("rememberMe")}
            onSignedIn={enterApp}
          />
        </div>
      ) : null}
    </AuthCard>
  );
}
