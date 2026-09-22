import { useTranslation } from "react-i18next";
import { useDashboardSummarySuspense } from "@/api/generated";
import { useMoney, usePercent } from "@/hooks/use-formatters";
import { EXPENSE_TONE, gainTone } from "@/lib/tone";
import { cn } from "@/lib/utils";

const NEUTRAL_TONE = "text-foreground";

export function DashboardStats() {
  const { t } = useTranslation();
  const money = useMoney();
  const percent = usePercent();
  const summary = useDashboardSummarySuspense();

  const income = Number(summary.data.monthIncome);
  const expense = Number(summary.data.monthExpense);
  const net = income - expense;
  const spentShare = income > 0 ? Math.min(1, expense / income) : 0;

  const rows = [
    {
      label: t("dashboard.monthIncome"),
      value: money.formatSigned(income, "+"),
      tone: gainTone(income) ?? NEUTRAL_TONE,
    },
    {
      label: t("dashboard.monthExpense"),
      value: money.formatSigned(expense, "−"),
      tone: expense === 0 ? NEUTRAL_TONE : EXPENSE_TONE,
    },
    {
      label: t("dashboard.monthNet"),
      value: money.formatSigned(net, "auto"),
      tone: gainTone(net) ?? NEUTRAL_TONE,
    },
  ];

  return (
    <div className="flex h-full flex-col justify-between gap-8">
      <dl>
        <dt className="text-sm text-muted-foreground">{t("dashboard.totalBalance")}</dt>
        <dd className="mt-1 max-w-full font-serif text-stat-lg font-semibold wrap-break-word lining-nums tabular-nums">
          {money.format(Number(summary.data.totalBalance))}
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
              <div
                className="w-(--spent-share) bg-destructive"
                style={{ "--spent-share": `${spentShare * 100}%` }}
              />
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
