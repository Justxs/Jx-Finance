import QRCode from "qrcode";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDisableTwoFactor, useMeSuspense, useSetupTwoFactor } from "@/api/generated";
import { TitledSection } from "@/components/ui/section/section";
import { PasswordPrompt } from "@/features/profile/password-prompt/password-prompt";
import type { TranslationKey } from "@/lib/i18n";
import { silentMutation } from "@/lib/mutations";
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

  const [setup, setSetup] = useState<{ qr: string; key: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const setupMutation = useSetupTwoFactor({
    mutation: {
      ...silentMutation,
      onSuccess: async (data) => {
        setSetup({
          qr: await QRCode.toDataURL(data.authenticatorUri ?? ""),
          key: data.sharedKey ?? "",
        });
      },
    },
  });

  const disableMutation = useDisableTwoFactor({
    mutation: { meta: { silent: true, success: t("profile.twoFactorDisabled") } },
  });

  function handleEnabled(codes: string[]) {
    setRecoveryCodes(codes);
    setSetup(null);
  }

  if (recoveryCodes) {
    return <TwoFactorRecoveryCodes codes={recoveryCodes} onDone={() => setRecoveryCodes(null)} />;
  }

  const mode: PromptMode = me.data.twoFactorEnabled ? "disable" : "enable";
  const promptMutation = mode === "disable" ? disableMutation : setupMutation;

  if (mode === "enable" && setup) {
    return (
      <TwoFactorSetup
        qrDataUrl={setup.qr}
        sharedKey={setup.key}
        onEnabled={handleEnabled}
        onCancel={() => setSetup(null)}
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
