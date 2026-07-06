import { useTranslation } from "react-i18next";
import { useGetNetWorthEndpoint } from "@/api/generated";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoney } from "@/hooks/use-formatters";

export function NetWorthStats() {
  const { t } = useTranslation();
  const money = useMoney();
  const netWorth = useGetNetWorthEndpoint();

  const stats = [
    { key: "netWorth.accounts", value: netWorth.data?.accounts },
    { key: "netWorth.assets", value: netWorth.data?.assets },
    { key: "netWorth.debts", value: netWorth.data?.debts },
    { key: "netWorth.netWorth", value: netWorth.data?.netWorth },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.key} className="card p-6">
          <p className="text-sm font-medium text-muted-foreground">{t(stat.key)}</p>
          {netWorth.isPending ? (
            <Skeleton className="mt-3 h-8 w-24" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
              {stat.value === undefined ? "—" : money.format(Number(stat.value))}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
