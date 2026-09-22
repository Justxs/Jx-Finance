import { useTranslation } from "react-i18next";
import { Disclosure } from "@/components/disclosure/disclosure";

const steps = ["create", "sections", "format", "period", "token", "queryId"] as const;

export function FlexQueryHelp() {
  const { t } = useTranslation();

  return (
    <Disclosure className="mt-6 border-t pt-3 text-sm" summary={t("investments.import.help.title")}>
      <ol className="max-w-prose list-decimal space-y-1.5 pl-5 text-muted-foreground marker:tabular-nums">
        {steps.map((step) => (
          <li key={step}>{t(`investments.import.help.${step}`)}</li>
        ))}
      </ol>
    </Disclosure>
  );
}
