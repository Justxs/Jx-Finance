import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useSendTestEmail, useUpdateSmtpSettings } from "@/api/generated";
import { SmtpEncryption } from "@/api/generated/model";
import type { SmtpSettingsResponse } from "@/api/generated/model";
import {
  updateSmtpSettingsBodyFromAddressMax,
  updateSmtpSettingsBodyFromNameMax,
  updateSmtpSettingsBodyHostMax,
  updateSmtpSettingsBodyPasswordMax,
  updateSmtpSettingsBodyPortMax,
  updateSmtpSettingsBodyUserNameMax,
} from "@/api/schemas/settings/settings.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { silentMutation } from "@/lib/mutations";
import { optionsOf } from "@/lib/options";
import { optionalText, wholeNumberBetween } from "@/lib/validation";

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

const encryptions: SmtpEncryption[] = ["none", "startTls", "sslOnConnect"];

export function SmtpForm({ settings }: Readonly<{ settings: SmtpSettingsResponse }>) {
  const { t } = useTranslation();

  const saveMutation = useUpdateSmtpSettings({
    mutation: { meta: { silent: true, success: t("settings.smtp.saved") } },
  });

  const testMutation = useSendTestEmail({
    mutation: {
      ...silentMutation,
      onSuccess: (result) => {
        toast.success(t("settings.smtp.testSent", { email: result.sentTo }));
      },
    },
  });

  const schema = z
    .object({
      enabled: z.boolean(),
      host: optionalText(t, updateSmtpSettingsBodyHostMax),
      port: wholeNumberBetween(t, 1, updateSmtpSettingsBodyPortMax),
      encryption: z.enum(SmtpEncryption),
      userName: optionalText(t, updateSmtpSettingsBodyUserNameMax),
      password: optionalText(t, updateSmtpSettingsBodyPasswordMax),
      fromAddress: optionalText(t, updateSmtpSettingsBodyFromAddressMax),
      fromName: optionalText(t, updateSmtpSettingsBodyFromNameMax),
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
    submit: async (value, formApi) => {
      testMutation.reset();
      await saveMutation.mutateAsync({
        data: {
          enabled: value.enabled,
          host: value.host.trim() || null,
          port: Number(value.port),
          encryption: value.encryption,
          userName: value.userName.trim() || null,
          password: value.password || null,
          fromAddress: value.fromAddress.trim() || null,
          fromName: value.fromName.trim() || null,
        },
      });
      formApi.reset({ ...value, password: "" });
    },
  });

  function sendTest() {
    saveMutation.reset();
    testMutation.mutate();
  }

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
                className="col-span-full"
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
                options={optionsOf(encryptions, (value) => t(`settings.smtp.encryptions.${value}`))}
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

        <FormError error={testMutation.error ?? saveMutation.error} />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            pending={testMutation.isPending}
            disabled={!settings.enabled}
            focusableWhenDisabled={testMutation.isPending || !settings.enabled}
            aria-describedby="smtp-test-hint"
            onClick={sendTest}
          >
            <Send />
            {t("settings.smtp.test")}
          </Button>
          <p id="smtp-test-hint" className="text-sm text-muted-foreground">
            {t("settings.smtp.testHint")}
          </p>
          <form.SubmitButton pending={saveMutation.isPending} className="ml-auto">
            {t("actions.save")}
          </form.SubmitButton>
        </div>
      </form.FormShell>
    </form.AppForm>
  );
}
