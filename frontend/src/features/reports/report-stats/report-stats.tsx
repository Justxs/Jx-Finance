import { useTranslation } from "react-i18next";
import { SummaryStats } from "@/components/summary-stats/summary-stats";

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
      tone: "text-income",
      sign: "+",
    },
    {
      key: "reports.totalExpense",
      value: totalExpense,
      tone: "text-expense",
      sign: "−",
    },
    {
      key: "reports.net",
      value: net,
      tone: "text-foreground",
      lead: true,
      sign: "auto",
    },
  ] as const;

  return <SummaryStats items={stats.map((stat) => ({ ...stat, label: t(stat.key) }))} />;
}
