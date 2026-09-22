import QRCode from "qrcode";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useDisableTwoFactor, useMeSuspense, useSetupTwoFactor } from "@/api/generated";
import type { TwoFactorSetupResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { silent } from "@/lib/mutations";
import { TwoFactorRecoveryCodes } from "./two-factor-recovery-codes";
import { TwoFactorSetup } from "./two-factor-setup";

interface PasswordPromptProps {
  subtitle: string;
  submitLabel: string;
  destructive?: boolean;
  pending: boolean;
  error: unknown;
  onSubmit: (password: string) => Promise<unknown>;
}

function PasswordPrompt({
  subtitle,
  submitLabel,
  destructive = false,
  pending,
  error,
  onSubmit,
}: Readonly<PasswordPromptProps>) {
  const { t } = useTranslation();

  const form = useServerForm({
    defaultValues: { password: "" },
    schema: z.object({ password: z.string() }),
    submit: async (value, formApi) => {
      try {
        await onSubmit(value.password);
      } finally {
        formApi.setFieldValue("password", "");
      }
    },
  });

  return (
    <form.AppForm>
      <form.FormShell as={Section} className="space-y-4 *:max-w-md">
        <SectionTitle>{t("profile.twoFactorTitle")}</SectionTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>

        <form.Field name="password">
          {(field) => (
            <field.TextField
              id="two-factor-password"
              label={t("profile.currentPassword")}
              type="password"
              autoComplete="current-password"
            />
          )}
        </form.Field>

        <FormError error={error} />

        <form.Subscribe selector={(state) => state.values.password !== ""}>
          {(ready) => (
            <form.SubmitButton
              variant={destructive ? "destructive" : "default"}
              pending={pending}
              disabled={!ready}
            >
              {submitLabel}
            </form.SubmitButton>
          )}
        </form.Subscribe>
      </form.FormShell>
    </form.AppForm>
  );
}

export function TwoFactorSettings() {
  const { t } = useTranslation();
  const me = useMeSuspense();

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sharedKey, setSharedKey] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const setupMutation = useSetupTwoFactor(
    silent({
      onSuccess: async (data: TwoFactorSetupResponse) => {
        setSharedKey(data.sharedKey ?? null);
        setQrDataUrl(await QRCode.toDataURL(data.authenticatorUri ?? ""));
      },
    }),
  );

  const disableMutation = useDisableTwoFactor(
    silent({
      onSuccess: () => {
        toast.success(t("profile.twoFactorDisabled"));
      },
    }),
  );

  function cancelSetup() {
    setQrDataUrl(null);
    setSharedKey(null);
  }

  function handleEnabled(codes: string[]) {
    setRecoveryCodes(codes);
    cancelSetup();
  }

  if (recoveryCodes) {
    return <TwoFactorRecoveryCodes codes={recoveryCodes} onDone={() => setRecoveryCodes(null)} />;
  }

  if (me.data?.twoFactorEnabled) {
    return (
      <PasswordPrompt
        subtitle={t("profile.twoFactorEnabledSubtitle")}
        submitLabel={t("profile.disableTwoFactor")}
        destructive
        pending={disableMutation.isPending}
        error={disableMutation.error}
        onSubmit={(password) => disableMutation.mutateAsync({ data: { password } })}
      />
    );
  }

  if (qrDataUrl && sharedKey) {
    return (
      <TwoFactorSetup
        qrDataUrl={qrDataUrl}
        sharedKey={sharedKey}
        onEnabled={handleEnabled}
        onCancel={cancelSetup}
      />
    );
  }

  return (
    <PasswordPrompt
      subtitle={t("profile.twoFactorDisabledSubtitle")}
      submitLabel={t("profile.enableTwoFactor")}
      pending={setupMutation.isPending}
      error={setupMutation.error}
      onSubmit={(password) => setupMutation.mutateAsync({ data: { password } })}
    />
  );
}
