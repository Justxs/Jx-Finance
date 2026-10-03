import { useTranslation } from "react-i18next";
import type { BudgetResponse } from "@/api/generated/model";
import { useMoney } from "@/hooks/use-formatters";
import { EXPENSE_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";

export function budgetFigures(budget: Pick<BudgetResponse, "spent" | "effectiveLimit">) {
  const spent = Number(budget.spent);
  const limit = Number(budget.effectiveLimit);
  return { spent, limit, over: spent > limit };
}

interface Props extends ReturnType<typeof budgetFigures> {
  className?: string;
}

export function BudgetRemaining({ spent, limit, over, className }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();

  return (
    <span
      className={cn("text-xs text-muted-foreground tabular-nums", className, over && EXPENSE_TONE)}
    >
      {over
        ? t("budgets.over", { amount: money.format(spent - limit) })
        : t("budgets.left", { amount: money.format(limit - spent) })}
    </span>
  );
}
