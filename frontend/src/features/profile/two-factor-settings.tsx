import { useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getMeEndpointQueryKey, useDisableTwoFactorEndpoint, useMeEndpoint, useSetupTwoFactorEndpoint } from "@/api/generated";
import { Button } from "@/components/ui/button";
import { TwoFactorRecoveryCodes } from "./two-factor-recovery-codes";
import { TwoFactorSetup } from "./two-factor-setup";

export function TwoFactorSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const me = useMeEndpoint();

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sharedKey, setSharedKey] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  function invalidateMe() {
    queryClient.invalidateQueries({ queryKey: getMeEndpointQueryKey() });
  }

  const setupMutation = useSetupTwoFactorEndpoint({
    mutation: {
      onSuccess: async (data) => {
        setSharedKey(data.sharedKey ?? null);
        setQrDataUrl(await QRCode.toDataURL(data.authenticatorUri ?? ""));
      },
    },
  });

  const disableMutation = useDisableTwoFactorEndpoint({
    mutation: {
      onSuccess: () => {
        toast.success(t("profile.twoFactorDisabled"));
        invalidateMe();
      },
    },
  });

  function cancelSetup() {
    setQrDataUrl(null);
    setSharedKey(null);
  }

  function handleEnabled(codes: string[]) {
    setRecoveryCodes(codes);
    cancelSetup();
    invalidateMe();
  }

  if (recoveryCodes) {
    return <TwoFactorRecoveryCodes codes={recoveryCodes} onDone={() => setRecoveryCodes(null)} />;
  }

  if (me.data?.twoFactorEnabled) {
    return (
      <div className="card max-w-md space-y-4 p-6">
        <h2 className="font-semibold">{t("profile.twoFactorTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("profile.twoFactorEnabledSubtitle")}</p>
        <Button
          type="button"
          variant="destructive"
          disabled={disableMutation.isPending}
          onClick={() => disableMutation.mutate()}
        >
          {t("profile.disableTwoFactor")}
        </Button>
      </div>
    );
  }

  if (qrDataUrl && sharedKey) {
    return (
      <TwoFactorSetup qrDataUrl={qrDataUrl} sharedKey={sharedKey} onEnabled={handleEnabled} onCancel={cancelSetup} />
    );
  }

  return (
    <div className="card max-w-md space-y-4 p-6">
      <h2 className="font-semibold">{t("profile.twoFactorTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("profile.twoFactorDisabledSubtitle")}</p>
      <Button type="button" disabled={setupMutation.isPending} onClick={() => setupMutation.mutate()}>
        {t("profile.enableTwoFactor")}
      </Button>
    </div>
  );
}
