import { useTranslation } from "react-i18next";
import type { BudgetResponse } from "@/api/generated/model";
import { ProgressRow } from "@/components/progress-row/progress-row";
import type { DeleteProps } from "@/components/row-actions/row-actions";
import { TransactionsLink } from "@/components/transactions-link/transactions-link";
import { budgetPeriodLabel } from "@/features/budgets/budget-periods";
import { BudgetRemaining, budgetFigures } from "@/features/budgets/budget-remaining";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";

interface Props extends DeleteProps {
  budget: BudgetResponse;
  onEdit: () => void;
}

export function BudgetRow({ budget, onEdit, ...deleteProps }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const isoDate = useIsoDate();
  const figures = budgetFigures(budget);
  const { spent, limit, over } = figures;

  return (
    <ProgressRow
      label={budget.name}
      title={
        <TransactionsLink
          name={budget.name}
          filter={{
            ...(budget.tagId
              ? { tagIds: budget.tagId }
              : { categoryId: budget.categoryId ?? undefined }),
            type: "expense",
            dateFrom: budget.windowStart,
            dateTo: budget.windowEnd,
          }}
        />
      }
      meta={
        <p className="text-xs text-muted-foreground">
          {t("budgets.windowLabel", {
            period: budgetPeriodLabel(t, budget.period),
            from: isoDate(budget.windowStart),
            to: isoDate(budget.windowEnd),
          })}
        </p>
      }
      primary={<BudgetRemaining {...figures} className="text-sm font-semibold text-foreground" />}
      secondary={
        <>
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("budgets.spentOf", { spent: money.format(spent), limit: money.format(limit) })}
          </p>
          {budget.rolloverEnabled ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {t("budgets.carryLabel", {
                base: money.format(Number(budget.limitAmount)),
                carried: money.formatSigned(Number(budget.carriedAmount)),
                effective: money.format(limit),
              })}
            </p>
          ) : null}
        </>
      }
      meter={{ value: spent, max: limit, tone: over ? "negative" : "primary" }}
      onEdit={onEdit}
      {...deleteProps}
    />
  );
}
