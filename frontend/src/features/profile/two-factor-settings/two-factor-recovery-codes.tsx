import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface Props {
  codes: string[];
  onDone: () => void;
}

export function TwoFactorRecoveryCodes({ codes, onDone }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div className="section space-y-4 *:max-w-md">
      <h2 className="section-title">{t("profile.recoveryCodesTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("profile.recoveryCodesSubtitle")}</p>
      <ul className="grid gap-2 rounded-md bg-muted p-4 font-mono text-sm sm:grid-cols-2">
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
