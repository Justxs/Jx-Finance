import { useTranslation } from "react-i18next";
import type { BudgetResponse } from "@/api/generated/model";
import { BudgetRemaining, budgetFigures } from "@/components/budget-remaining/budget-remaining";
import { ShareRow } from "@/components/share-row/share-row";
import { useMoney, usePercent } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { budgetOverview, budgetPeriodLabel } from "@/lib/budgets";
import { daysBetween } from "@/lib/calendar";
import { EXPENSE_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";

function usage(spent: string, limit: string) {
  const limitAmount = Number(limit);
  return limitAmount > 0 ? Number(spent) / limitAmount : 0;
}

function periodPassed(budget: Pick<BudgetResponse, "windowStart" | "windowEnd">, today: string) {
  const days = daysBetween(budget.windowStart, budget.windowEnd);
  const passed = daysBetween(budget.windowStart, today);
  if (days === null || passed === null) {
    return undefined;
  }
  return Math.min(1, Math.max(0, (passed + 1) / (days + 1)));
}

interface Props {
  budgets: readonly BudgetResponse[];
  ended: boolean;
}

export function BudgetRows({ budgets, ended }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const percent = usePercent();
  const today = useToday();
  const overview = budgetOverview(budgets);
  const rows = budgets.toSorted(
    (a, b) => usage(b.spent, b.effectiveLimit) - usage(a.spent, a.effectiveLimit),
  );

  return (
    <>
      {overview.over.length > 0 ? (
        <p className={cn("mb-3 text-sm font-medium", EXPENSE_TONE)}>
          {t("budgets.summary.overLine", {
            count: overview.over.length,
            total: rows.length,
            amount: money.format(overview.overCents / 100),
          })}
        </p>
      ) : null}
      <ul className="space-y-3.5">
        {rows.map((budget) => {
          const { spent, limit, over } = budgetFigures(budget);
          const passed = ended ? undefined : periodPassed(budget, today);
          return (
            <ShareRow
              key={budget.id}
              name={
                <span className="min-w-24 flex-1 wrap-break-word">
                  {budget.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    {budgetPeriodLabel(t, budget.period)}
                  </span>
                </span>
              }
              note={
                <BudgetRemaining
                  spent={spent}
                  limit={limit}
                  over={over}
                  className="shrink-0 text-right"
                />
              }
              amount={money.format(spent)}
              value={spent}
              max={limit}
              tone={over ? "negative" : "primary"}
              meterLabel={
                passed === undefined
                  ? budget.name
                  : t("dashboard.budgetPeriodPassed", {
                      name: budget.name,
                      percent: percent.format(passed),
                    })
              }
              meterMark={passed}
            />
          );
        })}
      </ul>
    </>
  );
}
