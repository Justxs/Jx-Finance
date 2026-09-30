import { useTranslation } from "react-i18next";
import { useBudgetsSuspense } from "@/api/generated";
import type { BudgetResponse } from "@/api/generated/model";
import { ShareRow } from "@/components/share-row/share-row";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { TextLink } from "@/components/ui/text-link/text-link";
import { BudgetRemaining, budgetFigures } from "@/features/budgets/budget-remaining";
import { asOfParams } from "@/features/dashboard/dashboard-queries";
import { useMoney, usePercent } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { daysBetween } from "@/lib/calendar";

const MAX_ROWS = 5;

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
  const money = useMoney();
  const percent = usePercent();
  const today = useToday();
  const budgets = useBudgetsSuspense(asOfParams(asOf));

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
        const passed = asOf === undefined ? periodPassed(budget, today) : undefined;
        return (
          <ShareRow
            key={budget.id}
            name={<span className="min-w-0 flex-1 wrap-break-word">{budget.name}</span>}
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
  );
}
