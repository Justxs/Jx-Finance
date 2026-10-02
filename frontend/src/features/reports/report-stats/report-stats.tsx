import { useTranslation } from "react-i18next";
import type { ReportComparisonTotals } from "@/api/generated/model";
import { ChangeBadge } from "@/components/change-badge/change-badge";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { changeOf } from "@/lib/comparison";
import { gainTone } from "@/lib/tone";

interface Props {
  totalIncome: string;
  totalExpense: string;
  net: string;
  comparison?: ReportComparisonTotals | null;
}

export function ReportStats({ totalIncome, totalExpense, net, comparison }: Readonly<Props>) {
  const { t } = useTranslation();

  const stats = [
    {
      key: "reports.totalIncome",
      value: totalIncome,
      earlier: comparison?.totalIncome,
      good: "up",
      tone: gainTone(Number(totalIncome), "+"),
      sign: "+",
    },
    {
      key: "reports.totalExpense",
      value: totalExpense,
      earlier: comparison?.totalExpense,
      good: "down",
      tone: gainTone(Number(totalExpense), "−"),
      sign: "−",
    },
    {
      key: "reports.net",
      value: net,
      earlier: comparison?.net,
      good: "up",
      lead: true,
      sign: "auto",
    },
  ] as const;

  return (
    <SummaryStats
      items={stats.map((stat) => ({
        ...stat,
        label: t(stat.key),
        note: comparison ? (
          <ChangeBadge change={changeOf(stat.value, stat.earlier)} good={stat.good} />
        ) : undefined,
      }))}
    />
  );
}
