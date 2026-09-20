import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useSetup } from "@/api/generated";
import {
  setupBodyDisplayNameMax,
  setupBodyPasswordMax,
  setupBodyPasswordMin,
} from "@/api/schemas/setup/setup.zod";
import { Brand } from "@/components/brand";
import { useAppForm } from "@/components/form";
import { FormError } from "@/components/form-error";
import { Card } from "@/components/ui/card";
import { setSetupNeeded } from "@/lib/auth-gate";
import { submitToServer } from "@/lib/form-server-errors";
import { password, requiredEmail, requiredText } from "@/lib/validation";

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

  const setupMutation = useSetup({
    mutation: {
      meta: { silent: true },
      onSuccess: () => {
        setSetupNeeded(false);
        navigate({ to: "/login" });
      },
    },
  });

  const defaultValues: FormValues = { email: "", password: "", displayName: "" };

  const form = useAppForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) => {
      const { value } = submission;

      return submitToServer(submission, () =>
        setupMutation.mutateAsync({
          data: {
            email: value.email.trim(),
            password: value.password,
            displayName: value.displayName.trim(),
          },
        }),
      );
    },
  });

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex justify-center">
        <Brand size="lg" stacked />
      </div>
      <Card className="p-6 sm:p-8">
        <h1 className="text-lg font-semibold">{t("auth.setupTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.setupSubtitle")}</p>

        <form.AppForm>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
            noValidate
            className="mt-6 space-y-4"
          >
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
          </form>
        </form.AppForm>
      </Card>
    </div>
  );
}
