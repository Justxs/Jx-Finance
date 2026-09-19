import QRCode from "qrcode";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useDisableTwoFactor, useMeSuspense, useSetupTwoFactor } from "@/api/generated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TwoFactorRecoveryCodes } from "./two-factor-recovery-codes";
import { TwoFactorSetup } from "./two-factor-setup";

interface PasswordPromptProps {
  subtitle: string;
  submitLabel: string;
  destructive?: boolean;
  password: string;
  pending: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}

function PasswordPrompt({
  subtitle,
  submitLabel,
  destructive = false,
  password,
  pending,
  onPasswordChange,
  onSubmit,
}: Readonly<PasswordPromptProps>) {
  const { t } = useTranslation();

  return (
    <form
      noValidate
      className="section space-y-4 *:max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (password && !pending) {
          onSubmit();
        }
      }}
    >
      <h2 className="section-title">{t("profile.twoFactorTitle")}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      <Label htmlFor="two-factor-password">{t("profile.currentPassword")}</Label>
      <Input
        id="two-factor-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
      />
      <Button
        type="submit"
        variant={destructive ? "destructive" : "default"}
        pending={pending}
        disabled={!password}
      >
        {submitLabel}
      </Button>
    </form>
  );
}

export function TwoFactorSettings() {
  const { t } = useTranslation();
  const me = useMeSuspense();

  const [password, setPassword] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sharedKey, setSharedKey] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const setupMutation = useSetupTwoFactor({
    mutation: {
      onSuccess: async (data) => {
        setPassword("");
        setSharedKey(data.sharedKey ?? null);
        setQrDataUrl(await QRCode.toDataURL(data.authenticatorUri ?? ""));
      },
      onError: () => setPassword(""),
    },
  });

  const disableMutation = useDisableTwoFactor({
    mutation: {
      onSuccess: () => {
        setPassword("");
        toast.success(t("profile.twoFactorDisabled"));
      },
      onError: () => setPassword(""),
    },
  });

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
        password={password}
        pending={disableMutation.isPending}
        onPasswordChange={setPassword}
        onSubmit={() => disableMutation.mutate({ data: { password } })}
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
      password={password}
      pending={setupMutation.isPending}
      onPasswordChange={setPassword}
      onSubmit={() => setupMutation.mutate({ data: { password } })}
    />
  );
}
