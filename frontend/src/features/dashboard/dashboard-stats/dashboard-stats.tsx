import { useTranslation } from "react-i18next";
import { useGetDashboardSummaryEndpointSuspense } from "@/api/generated";
import { SummaryStats } from "@/components/summary-stats";

export function DashboardStats() {
  const { t } = useTranslation();
  const summary = useGetDashboardSummaryEndpointSuspense();

  const stats = [
    {
      key: "dashboard.totalBalance",
      value: summary.data?.totalBalance,
      tone: "text-foreground",
    },
    {
      key: "dashboard.monthIncome",
      value: summary.data?.monthIncome,
      tone: "text-income",
      sign: "+",
    },
    {
      key: "dashboard.monthExpense",
      value: summary.data?.monthExpense,
      tone: "text-expense",
      sign: "−",
    },
  ] as const;

  return <SummaryStats items={stats.map((stat) => ({ ...stat, label: t(stat.key) }))} />;
}
