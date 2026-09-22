import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { SmtpEncryption } from "@/api/generated/model";
import type { SmtpSettingsResponse, UpdateSmtpSettingsRequest } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { optionalText, requiredValue } from "@/lib/validation";

interface FormValues {
  enabled: boolean;
  host: string;
  port: string;
  encryption: SmtpEncryption;
  userName: string;
  password: string;
  fromAddress: string;
  fromName: string;
}

interface Props {
  settings: SmtpSettingsResponse;
  pending: boolean;
  testPending: boolean;
  testError: unknown;
  onSubmit: (values: UpdateSmtpSettingsRequest, onSaved: () => void) => Promise<unknown> | void;
  onTest: () => void;
}

const encryptions: SmtpEncryption[] = ["none", "startTls", "sslOnConnect"];

export function SmtpForm({
  settings,
  pending,
  testPending,
  testError,
  onSubmit,
  onTest,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z
    .object({
      enabled: z.boolean(),
      host: optionalText(t, 255),
      port: requiredValue(t),
      encryption: z.enum(SmtpEncryption),
      userName: optionalText(t, 255),
      password: optionalText(t, 255),
      fromAddress: optionalText(t, 320),
      fromName: optionalText(t, 100),
    })
    .refine((value) => Number(value.port) >= 1 && Number(value.port) <= 65535, {
      message: t("validation.required"),
      path: ["port"],
    })
    .refine((value) => !value.enabled || value.host.trim() !== "", {
      message: t("validation.required"),
      path: ["host"],
    })
    .refine((value) => !value.enabled || value.fromAddress.trim() !== "", {
      message: t("validation.required"),
      path: ["fromAddress"],
    });

  const defaultValues: FormValues = {
    enabled: settings.enabled,
    host: settings.host ?? "",
    port: String(settings.port),
    encryption: settings.encryption,
    userName: settings.userName ?? "",
    password: "",
    fromAddress: settings.fromAddress ?? "",
    fromName: settings.fromName ?? "",
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value, formApi) =>
      onSubmit(
        {
          enabled: value.enabled,
          host: value.host.trim() || null,
          port: Number(value.port),
          encryption: value.encryption,
          userName: value.userName.trim() || null,
          password: value.password || null,
          fromAddress: value.fromAddress.trim() || null,
          fromName: value.fromName.trim() || null,
        },
        () => formApi.reset({ ...value, password: "" }),
      ),
  });

  return (
    <form.AppForm>
      <form.FormShell className="mt-4 space-y-5">
        <form.Field name="enabled">
          {(field) => (
            <field.CheckboxField
              id="smtp-enabled"
              className="max-w-prose"
              label={t("settings.smtp.enabled")}
              hint={t("settings.smtp.enabledHint")}
            />
          )}
        </form.Field>

        <FormGrid className="max-w-3xl">
          <form.Field name="host">
            {(field) => (
              <field.TextField
                id="smtp-host"
                label={t("settings.smtp.host")}
                hint={t("settings.smtp.hostHint")}
                placeholder="smtp.example.com"
              />
            )}
          </form.Field>

          <form.Field name="port">
            {(field) => (
              <field.TextField id="smtp-port" label={t("settings.smtp.port")} inputMode="numeric" />
            )}
          </form.Field>

          <form.Field name="encryption">
            {(field) => (
              <field.SelectFieldControl
                id="smtp-encryption"
                label={t("settings.smtp.encryption")}
                options={encryptions.map((value) => ({
                  value,
                  label: t(`settings.smtp.encryptions.${value}`),
                }))}
              />
            )}
          </form.Field>

          <form.Field name="userName">
            {(field) => (
              <field.TextField
                id="smtp-user-name"
                label={t("settings.smtp.userName")}
                hint={t("settings.smtp.userNameHint")}
                autoComplete="off"
              />
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <field.TextField
                id="smtp-password"
                type="password"
                label={t("settings.smtp.password")}
                hint={
                  settings.hasPassword
                    ? `${t("settings.smtp.passwordStored")} ${t("settings.smtp.passwordHint")}`
                    : t("settings.smtp.passwordHint")
                }
                autoComplete="new-password"
              />
            )}
          </form.Field>

          <form.Field name="fromAddress">
            {(field) => (
              <field.TextField
                id="smtp-from-address"
                label={t("settings.smtp.fromAddress")}
                hint={t("settings.smtp.fromAddressHint")}
                type="email"
              />
            )}
          </form.Field>

          <form.Field name="fromName">
            {(field) => (
              <field.TextField
                id="smtp-from-name"
                label={t("settings.smtp.fromName")}
                hint={t("settings.smtp.fromNameHint")}
              />
            )}
          </form.Field>
        </FormGrid>

        <FormError error={testError} />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            pending={testPending}
            disabled={!settings.enabled}
            onClick={onTest}
          >
            <Send />
            {t("settings.smtp.test")}
          </Button>
          <p className="text-sm text-muted-foreground">{t("settings.smtp.testHint")}</p>
          <form.SubmitButton pending={pending} className="ml-auto">
            {t("actions.save")}
          </form.SubmitButton>
        </div>
      </form.FormShell>
    </form.AppForm>
  );
}
