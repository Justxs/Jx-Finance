import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useSetup } from "@/api/generated";
import {
  setupBodyDisplayNameMax,
  setupBodyPasswordMax,
  setupBodyPasswordMin,
} from "@/api/schemas/setup/setup.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { setSetupNeeded } from "@/lib/auth-gate";
import { silent } from "@/lib/mutations";
import { password, requiredEmail, requiredText } from "@/lib/validation";
import { AuthCard } from "../auth-card/auth-card";

interface FormValues {
  email: string;
  password: string;
  displayName: string;
}

export function SetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const schema = z.object({
    email: requiredEmail(t),
    password: password(t, setupBodyPasswordMin, setupBodyPasswordMax),
    displayName: requiredText(t, setupBodyDisplayNameMax),
  });

  const setupMutation = useSetup(
    silent({
      onSuccess: () => {
        setSetupNeeded(false);
        void navigate({ to: "/login" });
      },
    }),
  );

  const defaultValues: FormValues = { email: "", password: "", displayName: "" };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) =>
      setupMutation.mutateAsync({
        data: {
          email: value.email.trim(),
          password: value.password,
          displayName: value.displayName.trim(),
        },
      }),
  });

  return (
    <AuthCard title={t("auth.setupTitle")} subtitle={t("auth.setupSubtitle")}>
      <form.AppForm>
        <form.FormShell className="mt-6 space-y-4">
          <form.Field name="displayName">
            {(field) => (
              <field.TextField
                id="setup-display-name"
                label={t("auth.displayName")}
                autoComplete="name"
                placeholder={t("auth.displayNamePlaceholder")}
              />
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <field.TextField
                id="setup-email"
                label={t("auth.email")}
                autoComplete="email"
                type="email"
              />
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <field.TextField
                id="setup-password"
                label={t("auth.password")}
                autoComplete="new-password"
                type="password"
              />
            )}
          </form.Field>

          <FormError error={setupMutation.error} />

          <form.SubmitButton pending={setupMutation.isPending} className="w-full">
            {t("auth.createAdmin")}
          </form.SubmitButton>
        </form.FormShell>
      </form.AppForm>
    </AuthCard>
  );
}
