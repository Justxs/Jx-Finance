import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import type { ReportComparisonTotals } from "@/api/generated/model";
import { ChangeBadge } from "@/components/change-badge/change-badge";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { changeOf } from "@/lib/comparison";
import { EXPENSE_TONE, INCOME_TONE } from "@/lib/tone";

interface Props {
  totalIncome: string;
  totalExpense: string;
  net: string;
  comparison?: ReportComparisonTotals | null;
  extra?: ComponentProps<typeof SummaryStats>["items"];
}

export function ReportStats({
  totalIncome,
  totalExpense,
  net,
  comparison,
  extra,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const stats = [
    {
      key: "reports.totalIncome",
      value: totalIncome,
      earlier: comparison?.totalIncome,
      good: "up",
      tone: INCOME_TONE,
      sign: "+",
    },
    {
      key: "reports.totalExpense",
      value: totalExpense,
      earlier: comparison?.totalExpense,
      good: "down",
      tone: EXPENSE_TONE,
      sign: "−",
    },
    {
      key: "reports.net",
      value: net,
      earlier: comparison?.net,
      good: "up",
      tone: "text-foreground",
      lead: true,
      sign: "auto",
    },
  ] as const;

  return (
    <SummaryStats
      items={[
        ...stats.map((stat) => ({
          ...stat,
          label: t(stat.key),
          note: <ChangeBadge change={changeOf(stat.value, stat.earlier)} good={stat.good} />,
        })),
        ...(extra ?? []),
      ]}
    />
  );
}
