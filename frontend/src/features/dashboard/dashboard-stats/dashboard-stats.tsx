import { useTranslation } from "react-i18next";
import { useDashboardSummarySuspense } from "@/api/generated";
import { useMoney, usePercent } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";

export function DashboardStats() {
  const { t } = useTranslation();
  const money = useMoney();
  const percent = usePercent();
  const summary = useDashboardSummarySuspense();

  const income = Number(summary.data?.monthIncome ?? 0);
  const expense = Number(summary.data?.monthExpense ?? 0);
  const net = income - expense;
  const spentShare = income > 0 ? Math.min(1, expense / income) : 0;

  let netTone = "text-foreground";
  if (net !== 0) {
    netTone = net > 0 ? "text-income" : "text-expense";
  }

  const rows = [
    {
      label: t("dashboard.monthIncome"),
      value: income === 0 ? money.format(0) : money.formatSigned(income, "+"),
      tone: income === 0 ? "text-foreground" : "text-income",
    },
    {
      label: t("dashboard.monthExpense"),
      value: expense === 0 ? money.format(0) : money.formatSigned(expense, "−"),
      tone: expense === 0 ? "text-foreground" : "text-expense",
    },
    {
      label: t("dashboard.monthNet"),
      value: net === 0 ? money.format(0) : money.formatSigned(net, "auto"),
      tone: netTone,
    },
  ];

  return (
    <div className="flex h-full flex-col justify-between gap-8">
      <dl>
        <dt className="text-sm text-muted-foreground">{t("dashboard.totalBalance")}</dt>
        <dd className="figure mt-1 max-w-full text-[2.75rem] leading-[1.1] wrap-break-word">
          {money.format(Number(summary.data?.totalBalance ?? 0))}
        </dd>
      </dl>

      <div>
        <dl className="space-y-2.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4">
              <dt className="min-w-0 text-sm text-muted-foreground">{row.label}</dt>
              <dd className={cn("shrink-0 text-lg font-semibold tabular-nums", row.tone)}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        {income > 0 ? (
          <div className="mt-5">
            <div aria-hidden="true" className="flex h-1.5 gap-0.5">
              <div className="bg-destructive" style={{ width: `${spentShare * 100}%` }} />
              <div className="flex-1 bg-secondary" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">
              {net >= 0
                ? t("dashboard.keptShare", { percent: percent.format(1 - spentShare) })
                : t("dashboard.overspent")}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
