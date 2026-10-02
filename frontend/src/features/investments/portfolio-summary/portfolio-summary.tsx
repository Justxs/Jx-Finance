import { useTranslation } from "react-i18next";
import type { PortfolioResponse } from "@/api/generated/model";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { chargeSign } from "@/features/investments/investment-types";
import { useNumberFormat } from "@/hooks/use-formatters";
import { gainTone } from "@/lib/tone";

interface Props {
  portfolio: PortfolioResponse;
}

export function PortfolioSummary({ portfolio }: Readonly<Props>) {
  const { t } = useTranslation();
  const percent = useNumberFormat({
    style: "percent",
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  });
  const annualized = portfolio.annualizedReturn == null ? null : Number(portfolio.annualizedReturn);

  const stats = [
    { key: "investments.summary.marketValue", value: portfolio.marketValue, lead: true },
    {
      key: "investments.summary.unrealizedGain",
      value: portfolio.unrealizedGain,
      sign: "auto",
    },
    {
      key: "investments.summary.realizedGain",
      value: portfolio.realizedGain,
      sign: "auto",
    },
    { key: "investments.summary.dividends", value: portfolio.dividends },
    {
      key: "investments.summary.withholdingTax",
      value: portfolio.withholdingTax,
      sign: chargeSign(portfolio.withholdingTax),
    },
  ] as const;

  const returnStat =
    annualized === null
      ? []
      : [
          {
            label: t("investments.summary.annualizedReturn"),
            value: portfolio.annualizedReturn ?? undefined,
            text: percent.format(annualized),
            tone: gainTone(annualized),
            detail: t("investments.summary.annualizedReturnDetail"),
          },
        ];

  return (
    <div className="space-y-4">
      <SummaryStats
        items={[...stats.map((stat) => ({ ...stat, label: t(stat.key) })), ...returnStat]}
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
