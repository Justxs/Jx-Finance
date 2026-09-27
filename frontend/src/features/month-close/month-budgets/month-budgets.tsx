import { useTranslation } from "react-i18next";
import type { BudgetResponse } from "@/api/generated/model";
import { ProgressAmount, ProgressRow } from "@/components/progress-row/progress-row";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { TitledSection } from "@/components/ui/section/section";
import { BudgetRemaining, budgetFigures } from "@/features/budgets/budget-remaining";
import { useMoney } from "@/hooks/use-formatters";

interface Props {
  budgets: readonly BudgetResponse[];
}

export function MonthBudgets({ budgets }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();

  return (
    <TitledSection
      title={t("monthClose.budgets.title")}
      description={t("monthClose.budgets.description")}
      bodyGap="sm"
    >
      {budgets.length === 0 ? (
        <EmptyText>{t("monthClose.budgets.empty")}</EmptyText>
      ) : (
        <Rows>
          {budgets.map((budget) => {
            const { spent, limit, over } = budgetFigures(budget);
            return (
              <ProgressRow
                key={budget.id}
                label={budget.categoryName}
                title={budget.categoryName}
                primary={
                  <ProgressAmount
                    amount={money.format(spent)}
                    of={t("budgets.ofLimit", { amount: money.format(limit) })}
                  />
                }
                secondary={<BudgetRemaining spent={spent} limit={limit} className="block" />}
                meter={{ value: spent, max: limit, tone: over ? "negative" : "primary" }}
              />
            );
          })}
        </Rows>
      )}
    </TitledSection>
  );
}
