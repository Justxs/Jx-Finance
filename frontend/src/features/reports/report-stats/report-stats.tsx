import { SummaryStats } from "@/components/summary-stats";
import { useTranslation } from "react-i18next";

interface Props {
  totalIncome: string;
  totalExpense: string;
  net: string;
}

export function ReportStats({ totalIncome, totalExpense, net }: Readonly<Props>) {
  const { t } = useTranslation();

  const stats = [
    {
      key: "reports.totalIncome",
      value: totalIncome,
      tone: "text-secondary",
    },
    {
      key: "reports.totalExpense",
      value: totalExpense,
      tone: "text-destructive",
    },
    {
      key: "reports.net",
      value: net,
      tone: "text-foreground",
    },
  ] as const;

  return <SummaryStats items={stats.map((stat) => ({ ...stat, label: t(stat.key) }))} />;
}
