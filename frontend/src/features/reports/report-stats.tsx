import { Scale, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMoney } from "@/hooks/use-formatters";

interface Props {
  totalIncome: string;
  totalExpense: string;
  net: string;
}

export function ReportStats({ totalIncome, totalExpense, net }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();

  const stats = [
    { key: "reports.totalIncome", value: totalIncome, icon: TrendingUp, tone: "text-secondary", chip: "bg-secondary/15 text-secondary" },
    { key: "reports.totalExpense", value: totalExpense, icon: TrendingDown, tone: "text-destructive", chip: "bg-destructive/10 text-destructive" },
    { key: "reports.net", value: net, icon: Scale, tone: "text-foreground", chip: "bg-primary/10 text-primary" },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.key} className="card flex items-start justify-between p-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t(stat.key)}</p>
            <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${stat.tone}`}>
              {money.format(Number(stat.value))}
            </p>
          </div>
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${stat.chip}`}>
            <stat.icon className="size-5" />
          </span>
        </div>
      ))}
    </div>
  );
}
