import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useBudgetSuggestionsSuspense, useCreateBudget } from "@/api/generated";
import { ListSection } from "@/components/list-section/list-section";
import { Button } from "@/components/ui/button/button";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { useMoney } from "@/hooks/use-formatters";
import { notify } from "@/lib/mutations";

const MAX_CANDIDATES = 5;

export function BudgetSuggestions() {
  const { t } = useTranslation();
  const money = useMoney();
  const suggestions = useBudgetSuggestionsSuspense({ period: "monthly" });
  const create = useCreateBudget(notify(t("budgets.suggestions.created")));
  const creatingId = create.isPending ? create.variables?.data.categoryId : null;

  const candidates = suggestions.data.categories
    .flatMap((item) =>
      item.isSteady && !item.hasBudget && item.suggestedLimit
        ? [{ ...item, limit: item.suggestedLimit }]
        : [],
    )
    .toSorted((a, b) => Number(b.median) - Number(a.median))
    .slice(0, MAX_CANDIDATES);

  if (candidates.length === 0) {
    return null;
  }

  return (
    <ListSection
      title={t("budgets.suggestions.title")}
      count={candidates.length}
      description={t("budgets.suggestions.description")}
      emptyText=""
    >
      {candidates.map((item) => (
        <li
          key={item.categoryId}
          className="flex flex-wrap items-center justify-between gap-2 py-2.5"
        >
          <div className="min-w-0 flex-1">
            <Tooltip content={t("dashboard.showTransactions", { category: item.categoryName })}>
              <Link
                to="/transactions"
                search={{
                  page: 1,
                  categoryId: item.categoryId,
                  type: "expense",
                  dateFrom: item.windows[0]?.start,
                  dateTo: item.windows.at(-1)?.end,
                }}
                className="text-sm font-medium wrap-break-word underline-offset-4 hover:underline"
              >
                {item.categoryName}
              </Link>
            </Tooltip>
            <p className="text-xs text-muted-foreground tabular-nums">
              {t("budgets.suggestions.about", { amount: money.format(Number(item.median)) })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            pending={creatingId === item.categoryId}
            disabled={create.isPending}
            onClick={() =>
              create.mutate({
                data: {
                  categoryId: item.categoryId,
                  limitAmount: item.limit,
                  period: "monthly",
                  rolloverEnabled: false,
                },
              })
            }
          >
            {t("budgets.suggestions.create", { amount: money.format(Number(item.limit)) })}
          </Button>
        </li>
      ))}
    </ListSection>
  );
}
