import QRCode from "qrcode";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDisableTwoFactor, useMeSuspense, useSetupTwoFactor } from "@/api/generated";
import type { TwoFactorSetupResponse } from "@/api/generated/model";
import { TitledSection } from "@/components/ui/section/section";
import type { TranslationKey } from "@/lib/i18n";
import { silent } from "@/lib/mutations";
import { PasswordPrompt } from "../password-prompt/password-prompt";
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

  const copy = promptCopy[mode];

  return (
    <TitledSection title={t("profile.twoFactorTitle")} description={t(copy.subtitle)} bodyGap="md">
      <PasswordPrompt
        id="two-factor-password"
        submitLabel={t(copy.submitLabel)}
        variant={copy.variant}
        pending={promptMutation.isPending}
        error={promptMutation.error}
        onSubmit={(password) => promptMutation.mutateAsync({ data: { password } })}
      />
    </TitledSection>
  );
}
