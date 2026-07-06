import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface Props {
  codes: string[];
  onDone: () => void;
}

export function TwoFactorRecoveryCodes({ codes, onDone }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div className="card max-w-md space-y-4 p-6">
      <h2 className="font-semibold">{t("profile.recoveryCodesTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("profile.recoveryCodesSubtitle")}</p>
      <ul className="grid grid-cols-2 gap-2 rounded-md bg-muted p-4 font-mono text-sm">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <Button type="button" onClick={onDone}>
        {t("profile.recoveryCodesDone")}
      </Button>
    </div>
  );
}
