import { useTranslation } from "react-i18next";
import { useBudgetsSuspense } from "@/api/generated";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Meter } from "@/components/ui/meter/meter";
import { TextLink } from "@/components/ui/text-link/text-link";
import { useMoney } from "@/hooks/use-formatters";

const MAX_ROWS = 5;

function usage(spent: string, limit: string) {
  const limitAmount = Number(limit);
  return limitAmount > 0 ? Number(spent) / limitAmount : 0;
}

export function BudgetSnapshot() {
  const { t } = useTranslation();
  const money = useMoney();
  const budgets = useBudgetsSuspense();

  const rows = budgets.data
    .toSorted((a, b) => usage(b.spent, b.limitAmount) - usage(a.spent, a.limitAmount))
    .slice(0, MAX_ROWS);

  if (rows.length === 0) {
    return (
      <EmptyText>
        {t("dashboard.noBudgets")} <TextLink to="/budgets">{t("budgets.add")}</TextLink>
      </EmptyText>
    );
  }

  return (
    <ul className="space-y-3.5">
      {rows.map((budget) => {
        const spent = Number(budget.spent);
        const limit = Number(budget.limitAmount);
        const overBudget = spent > limit;
        return (
          <li key={budget.id}>
            <div className="flex items-baseline gap-3 text-sm">
              <span className="min-w-0 flex-1 wrap-break-word">{budget.categoryName}</span>
              <span
                className={`shrink-0 text-right text-xs tabular-nums ${overBudget ? "text-expense" : "text-muted-foreground"}`}
              >
                {overBudget
                  ? t("budgets.over", { amount: money.format(spent - limit) })
                  : t("budgets.left", { amount: money.format(limit - spent) })}
              </span>
              <span className="w-24 shrink-0 text-right font-medium tabular-nums">
                {money.format(spent)}
              </span>
            </div>
            <Meter
              value={spent}
              max={limit}
              tone={overBudget ? "negative" : "primary"}
              label={budget.categoryName}
              className="mt-1.5"
            />
          </li>
        );
      })}
    </ul>
  );
}
