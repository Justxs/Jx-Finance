import { useTranslation } from "react-i18next";
import { useNetWorthSuspense } from "@/api/generated";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { EXPENSE_TONE } from "@/lib/tone";

export function NetWorthStats() {
  const { t } = useTranslation();
  const netWorth = useNetWorthSuspense();

  const stats = [
    { key: "netWorth.accounts", value: netWorth.data?.accounts },
    { key: "netWorth.assets", value: netWorth.data?.assets },
    { key: "netWorth.debts", value: netWorth.data?.debts, tone: EXPENSE_TONE, sign: "−" },
    { key: "netWorth.netWorth", value: netWorth.data?.netWorth, lead: true },
  ] as const;

  return <SummaryStats items={stats.map((stat) => ({ ...stat, label: t(stat.key) }))} />;
}
