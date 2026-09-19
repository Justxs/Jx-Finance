import { useTranslation } from "react-i18next";
import { useDashboardSummarySuspense } from "@/api/generated";
import { SummaryStats } from "@/components/summary-stats";
import { fromCents, toCents } from "@/lib/money";

export function DashboardStats() {
  const { t } = useTranslation();
  const summary = useDashboardSummarySuspense();

  const income = Number(summary.data?.monthIncome ?? 0);
  const expense = Number(summary.data?.monthExpense ?? 0);

  let netTone = "text-foreground";
  if (income !== expense) {
    netTone = income > expense ? "text-income" : "text-expense";
  }

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
    {
      key: "dashboard.monthNet",
      value: fromCents(
        toCents(summary.data?.monthIncome ?? "0") - toCents(summary.data?.monthExpense ?? "0"),
      ),
      tone: netTone,
      sign: income === expense ? undefined : "auto",
    },
  ] as const;

  return <SummaryStats items={stats.map((stat) => ({ ...stat, label: t(stat.key) }))} />;
}
