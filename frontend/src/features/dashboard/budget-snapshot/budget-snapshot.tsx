import { useTranslation } from "react-i18next";
import { useBudgetsSuspense } from "@/api/generated";
import type { BudgetResponse } from "@/api/generated/model";
import { ShareRow } from "@/components/share-row/share-row";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { TextLink } from "@/components/ui/text-link/text-link";
import { budgetOverview } from "@/features/budgets/budget-overview";
import { budgetPeriodLabel } from "@/features/budgets/budget-periods";
import { BudgetRemaining, budgetFigures } from "@/features/budgets/budget-remaining";
import { asOfParams } from "@/features/dashboard/dashboard-queries";
import { useMoney, usePercent } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { daysBetween } from "@/lib/calendar";
import { EXPENSE_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { useShare, withShare } from "@/stores/my-share-store";

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
  asOf?: string;
}

export function BudgetSnapshot({ asOf }: Readonly<Props>) {
  const { t } = useTranslation();
  const budgets = useBudgetsSuspense(withShare(asOfParams(asOf), useShare()));

  if (budgets.data.length === 0) {
    return (
      <EmptyText>
        {t("dashboard.noBudgets")} <TextLink to="/budgets">{t("budgets.add")}</TextLink>
      </EmptyText>
    );
  }

  return <BudgetRows budgets={budgets.data} ended={asOf !== undefined} />;
}

interface RowsProps {
  budgets: readonly BudgetResponse[];
  ended: boolean;
}

export function BudgetRows({ budgets, ended }: Readonly<RowsProps>) {
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
