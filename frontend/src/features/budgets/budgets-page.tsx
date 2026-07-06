import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  getGetBudgetsEndpointQueryKey,
  useDeleteBudgetEndpoint,
  useGetBudgetsEndpoint,
  useGetCategoriesEndpoint,
} from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoney } from "@/hooks/use-formatters";
import { CreateBudgetForm } from "./create-budget-form";

export function BudgetsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const money = useMoney();

  const categories = useGetCategoriesEndpoint();
  const budgets = useGetBudgetsEndpoint();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetBudgetsEndpointQueryKey() });
  }

  const deleteMutation = useDeleteBudgetEndpoint({ mutation: { onSettled: invalidate } });

  const budgetList = budgets.data ?? [];
  const categoryList = categories.data ?? [];

  let content: ReactNode;
  if (budgets.isPending) {
    content = (
      <div className="space-y-4 p-6">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  } else if (budgetList.length === 0) {
    content = <p className="px-6 py-8 text-sm text-muted-foreground">{t("budgets.empty")}</p>;
  } else {
    content = (
      <ul className="divide-y divide-border">
        {budgetList.map((budget) => {
          const limit = Number(budget.limitAmount);
          const spent = Number(budget.spent);
          const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
          const overBudget = spent > limit;
          return (
            <li key={budget.id} className="space-y-2 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{budget.categoryName}</p>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-semibold tabular-nums ${overBudget ? "text-destructive" : ""}`}
                  >
                    {money.format(spent)} / {money.format(limit)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate({ id: budget.id! })}
                  >
                    {t("actions.delete")}
                  </Button>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${overBudget ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t("budgets.title")} subtitle={t("budgets.subtitle")} />

      <section className="card p-6">
        <h2 className="mb-5 font-semibold">{t("budgets.add")}</h2>
        <CreateBudgetForm categories={categoryList} onCreated={invalidate} />
      </section>

      <section className="card overflow-hidden">{content}</section>
    </div>
  );
}
