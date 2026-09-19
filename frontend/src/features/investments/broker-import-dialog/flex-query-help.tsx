import { useTranslation } from "react-i18next";

const steps = ["create", "sections", "format", "period", "token", "queryId"] as const;

export function FlexQueryHelp() {
  const { t } = useTranslation();

  return (
    <details className="mt-6 border-t pt-3 text-sm">
      <summary className="w-fit cursor-pointer rounded-sm py-1 font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
        {t("investments.import.help.title")}
      </summary>
      <ol className="mt-2 max-w-prose list-decimal space-y-1.5 pl-5 text-muted-foreground marker:tabular-nums">
        {steps.map((step) => (
          <li key={step}>{t(`investments.import.help.${step}`)}</li>
        ))}
      </ol>
    </details>
  );
}
