import { SummaryStats } from "@/components/summary-stats";
import { useTranslation } from "react-i18next";
import { useGetNetWorthEndpointSuspense } from "@/api/generated";

export function NetWorthStats() {
  const { t } = useTranslation();
  const netWorth = useGetNetWorthEndpointSuspense();

  const stats = [
    { key: "netWorth.accounts", value: netWorth.data?.accounts },
    { key: "netWorth.assets", value: netWorth.data?.assets },
    { key: "netWorth.debts", value: netWorth.data?.debts },
    { key: "netWorth.netWorth", value: netWorth.data?.netWorth },
  ] as const;

  return <SummaryStats items={stats.map((stat) => ({ ...stat, label: t(stat.key) }))} />;
}
