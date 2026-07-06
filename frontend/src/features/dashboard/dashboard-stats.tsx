import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGetDashboardSummaryEndpoint } from "@/api/generated";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoney } from "@/hooks/use-formatters";

export function DashboardStats() {
  const { t } = useTranslation();
  const money = useMoney();
  const summary = useGetDashboardSummaryEndpoint();

  const stats = [
    {
      key: "dashboard.totalBalance",
      value: summary.data?.totalBalance,
      icon: Wallet,
      chip: "bg-primary/10 text-primary",
      tone: "text-foreground",
    },
    {
      key: "dashboard.monthIncome",
      value: summary.data?.monthIncome,
      icon: TrendingUp,
      chip: "bg-secondary/15 text-secondary",
      tone: "text-secondary",
    },
    {
      key: "dashboard.monthExpense",
      value: summary.data?.monthExpense,
      icon: TrendingDown,
      chip: "bg-destructive/10 text-destructive",
      tone: "text-destructive",
    },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.key} className="card flex items-start justify-between p-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t(stat.key)}</p>
            {summary.isPending ? (
              <Skeleton className="mt-3 h-8 w-32" />
            ) : (
              <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${stat.tone}`}>
                {stat.value === undefined ? "—" : money.format(Number(stat.value))}
              </p>
            )}
          </div>
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${stat.chip}`}
          >
            <stat.icon className="size-5" />
          </span>
        </div>
      ))}
    </div>
  );
}
