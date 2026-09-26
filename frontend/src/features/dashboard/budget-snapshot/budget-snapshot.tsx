import { useTranslation } from "react-i18next";
import { useBudgetsSuspense } from "@/api/generated";
import { ShareRow } from "@/components/breakdown-list/share-row";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { TextLink } from "@/components/ui/text-link/text-link";
import { BudgetRemaining, budgetFigures } from "@/features/budgets/budget-remaining";
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
    .toSorted((a, b) => usage(b.spent, b.effectiveLimit) - usage(a.spent, a.effectiveLimit))
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
        const { spent, limit, over } = budgetFigures(budget);
        return (
          <ShareRow
            key={budget.id}
            name={<span className="min-w-0 flex-1 wrap-break-word">{budget.categoryName}</span>}
            note={<BudgetRemaining spent={spent} limit={limit} className="shrink-0 text-right" />}
            amount={money.format(spent)}
            value={spent}
            max={limit}
            tone={over ? "negative" : "primary"}
            meterLabel={budget.categoryName}
          />
        );
      })}
    </ul>
  );
}
