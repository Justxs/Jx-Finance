import QRCode from "qrcode";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useDisableTwoFactor, useMeSuspense, useSetupTwoFactor } from "@/api/generated";
import type { TwoFactorSetupResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Section, SectionTitle } from "@/components/ui/section/section";
import type { TranslationKey } from "@/lib/i18n";
import { silent } from "@/lib/mutations";
import { TwoFactorRecoveryCodes } from "./two-factor-recovery-codes";
import { TwoFactorSetup } from "./two-factor-setup";

type PromptMode = "enable" | "disable";

const promptCopy = {
  enable: {
    subtitle: "profile.twoFactorDisabledSubtitle",
    submitLabel: "profile.enableTwoFactor",
    variant: "default",
  },
  disable: {
    subtitle: "profile.twoFactorEnabledSubtitle",
    submitLabel: "profile.disableTwoFactor",
    variant: "destructive",
  },
} as const satisfies Record<
  PromptMode,
  { subtitle: TranslationKey; submitLabel: TranslationKey; variant: "default" | "destructive" }
>;

interface PasswordPromptProps {
  mode: PromptMode;
  pending: boolean;
  error: unknown;
  onSubmit: (password: string) => Promise<unknown>;
}

function PasswordPrompt({ mode, pending, error, onSubmit }: Readonly<PasswordPromptProps>) {
  const { t } = useTranslation();
  const copy = promptCopy[mode];

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
        <p className="text-sm text-muted-foreground">{t(copy.subtitle)}</p>

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
            <form.SubmitButton variant={copy.variant} pending={pending} disabled={!ready}>
              {t(copy.submitLabel)}
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
    silent({ meta: { success: t("profile.twoFactorDisabled") } }),
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

  const mode: PromptMode = me.data?.twoFactorEnabled ? "disable" : "enable";
  const promptMutation = mode === "disable" ? disableMutation : setupMutation;

  if (mode === "enable" && qrDataUrl && sharedKey) {
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
      mode={mode}
      pending={promptMutation.isPending}
      error={promptMutation.error}
      onSubmit={(password) => promptMutation.mutateAsync({ data: { password } })}
    />
  );
}
