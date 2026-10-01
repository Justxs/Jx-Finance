import { useTranslation } from "react-i18next";
import { useNetWorthSuspense } from "@/api/generated";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { fromCents, toCents } from "@/lib/money";
import { EXPENSE_TONE } from "@/lib/tone";

export function NetWorthStats() {
  const { t } = useTranslation();
  const { assets, debts, receivable, payable, countsOpenBalances, ...totals } =
    useNetWorthSuspense().data;

  const stats = [
    { key: "netWorth.accounts", value: totals.accounts, shown: true },
    {
      key: "netWorth.assets",
      value: fromCents(toCents(assets) - toCents(receivable)),
      shown: true,
    },
    { key: "netWorth.openBalances.receivable", value: receivable, shown: countsOpenBalances },
    {
      key: "netWorth.debts",
      value: fromCents(toCents(debts) - toCents(payable)),
      tone: EXPENSE_TONE,
      sign: "−",
      shown: true,
    },
    {
      key: "netWorth.openBalances.payable",
      value: payable,
      tone: EXPENSE_TONE,
      sign: "−",
      shown: countsOpenBalances,
    },
    { key: "netWorth.netWorth", value: totals.netWorth, lead: true, shown: true },
  ] as const;

  return (
    <SummaryStats
      items={stats
        .filter((stat) => stat.shown)
        .map(({ shown: _shown, ...stat }) => ({ ...stat, label: t(stat.key) }))}
    />
  );
}
