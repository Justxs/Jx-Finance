import { useTranslation } from "react-i18next";
import type { PortfolioResponse } from "@/api/generated/model";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { gainTone } from "../gain-tone";

interface Props {
  portfolio: PortfolioResponse;
}

export function PortfolioSummary({ portfolio }: Readonly<Props>) {
  const { t } = useTranslation();

  const stats = [
    { key: "investments.summary.marketValue", value: portfolio.marketValue, lead: true },
    {
      key: "investments.summary.unrealizedGain",
      value: portfolio.unrealizedGain,
      sign: "auto",
      tone: gainTone(Number(portfolio.unrealizedGain)),
    },
    {
      key: "investments.summary.realizedGain",
      value: portfolio.realizedGain,
      sign: "auto",
      tone: gainTone(Number(portfolio.realizedGain)),
    },
    { key: "investments.summary.dividends", value: portfolio.dividends },
    {
      key: "investments.summary.withholdingTax",
      value: portfolio.withholdingTax,
      sign: Number(portfolio.withholdingTax) > 0 ? "−" : undefined,
    },
  ] as const;

  return (
    <div className="space-y-4">
      <SummaryStats
        items={stats.map((stat) => ({ ...stat, label: t(stat.key) }))}
        currency={portfolio.reportingCurrency}
      />
      {portfolio.isComplete ? null : (
        <p role="note" className="max-w-prose text-sm text-muted-foreground">
          {t("investments.summary.incomplete")}
        </p>
      )}
    </div>
  );
}
