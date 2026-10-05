import { useTranslation } from "react-i18next";
import { FormActions } from "@/components/form/form-actions/form-actions";
import { Button } from "@/components/ui/button/button";
import { Section, SectionTitle } from "@/components/ui/section/section";

interface Props {
  codes: string[];
  onDone: () => void;
}

export function TwoFactorRecoveryCodes({ codes, onDone }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Section as="div" className="space-y-4 *:max-w-md">
      <SectionTitle>{t("profile.recoveryCodesTitle")}</SectionTitle>
      <p className="text-sm text-muted-foreground">{t("profile.recoveryCodesSubtitle")}</p>
      <ul className="grid gap-2 border-y py-3 font-mono text-sm sm:grid-cols-2">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <FormActions>
        <Button type="button" onClick={onDone}>
          {t("profile.recoveryCodesDone")}
        </Button>
      </FormActions>
    </Section>
  );
}
