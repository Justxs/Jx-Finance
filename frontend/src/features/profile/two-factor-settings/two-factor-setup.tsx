import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnableTwoFactor } from "@/api/generated";
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

  const enableMutation = useEnableTwoFactor({
    mutation: {
      onSuccess: (data) => onEnabled(data.recoveryCodes ?? []),
    },
  });

  return (
    <div className="section space-y-4 *:max-w-md">
      <h2 className="section-title">{t("profile.twoFactorTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("profile.scanQrSubtitle")}</p>
      <img
        src={qrDataUrl}
        alt={t("profile.qrCodeAlt")}
        className="h-auto w-48 max-w-full rounded-md border"
      />
      <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">{sharedKey}</p>
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
