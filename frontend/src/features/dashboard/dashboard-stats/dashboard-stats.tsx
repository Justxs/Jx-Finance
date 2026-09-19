import { useTranslation } from "react-i18next";
import { useGetDashboardSummarySuspense } from "@/api/generated";
import { SummaryStats } from "@/components/summary-stats";

export function DashboardStats() {
  const { t } = useTranslation();
  const summary = useGetDashboardSummarySuspense();

  const income = Number(summary.data?.monthIncome ?? 0);
  const expense = Number(summary.data?.monthExpense ?? 0);

  const stats = [
    {
      key: "dashboard.totalBalance",
      value: summary.data?.totalBalance,
      tone: "text-foreground",
    },
    {
      key: "dashboard.monthIncome",
      value: summary.data?.monthIncome,
      tone: income === 0 ? "text-foreground" : "text-income",
      sign: income === 0 ? undefined : "+",
    },
    {
      key: "dashboard.monthExpense",
      value: summary.data?.monthExpense,
      tone: expense === 0 ? "text-foreground" : "text-expense",
      sign: expense === 0 ? undefined : "−",
    },
  ] as const;

  return <SummaryStats items={stats.map((stat) => ({ ...stat, label: t(stat.key) }))} />;
}
