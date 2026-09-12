import { SummaryStats } from "@/components/summary-stats";
import { useTranslation } from "react-i18next";
import { useGetDashboardSummaryEndpointSuspense } from "@/api/generated";

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
      tone: "text-secondary",
    },
    {
      key: "dashboard.monthExpense",
      value: summary.data?.monthExpense,
      tone: "text-destructive",
    },
  ] as const;

  return <SummaryStats items={stats.map((stat) => ({ ...stat, label: t(stat.key) }))} />;
}
