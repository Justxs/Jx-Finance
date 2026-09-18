import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnableTwoFactorEndpoint } from "@/api/generated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  qrDataUrl: string;
  sharedKey: string;
  onEnabled: (recoveryCodes: string[]) => void;
  onCancel: () => void;
}

export function TwoFactorSetup({ qrDataUrl, sharedKey, onEnabled, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");

  const enableMutation = useEnableTwoFactorEndpoint({
    mutation: {
      onSuccess: (data) => onEnabled(data.recoveryCodes ?? []),
    },
  });

  return (
    <div className="card max-w-md space-y-4 p-6">
      <h2 className="font-semibold">{t("profile.twoFactorTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("profile.scanQrSubtitle")}</p>
      <img
        src={qrDataUrl}
        alt="Authenticator QR code"
        className="h-auto w-48 max-w-full rounded-md border"
      />
      <p className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">{sharedKey}</p>
      <div className="space-y-1.5">
        <Label htmlFor="two-factor-code">{t("profile.enterCode")}</Label>
        <Input
          id="two-factor-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          maxLength={6}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          pending={enableMutation.isPending}
          disabled={code.length !== 6}
          onClick={() => enableMutation.mutate({ data: { code } })}
        >
          {t("profile.confirmAndEnable")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
      </div>
    </div>
  );
}
