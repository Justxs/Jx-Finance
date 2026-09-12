import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getGetBudgetsEndpointQueryKey,
  useDeleteBudgetEndpoint,
  useGetBudgetsEndpointSuspense,
  useGetCategoriesEndpointSuspense,
} from "@/api/generated";
import type { BudgetResponse } from "@/api/generated/model";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useMoney } from "@/hooks/use-formatters";
import { CreateBudgetForm } from "./create-budget-form";

export function BudgetsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const money = useMoney();
  const [editing, setEditing] = useState<BudgetResponse | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const categories = useGetCategoriesEndpointSuspense();
  const budgets = useGetBudgetsEndpointSuspense();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetBudgetsEndpointQueryKey() });
  }

  const deleteMutation = useDeleteBudgetEndpoint({ mutation: { onSettled: invalidate } });

  const budgetList = budgets.data ?? [];
  const categoryList = categories.data ?? [];

  const deletingId = deleteMutation.isPending ? deleteMutation.variables?.id : undefined;

  let content: ReactNode;
  if (budgetList.length === 0) {
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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 wrap-break-word font-medium">{budget.categoryName}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-sm font-semibold tabular-nums ${overBudget ? "text-destructive" : ""}`}
                  >
                    {money.format(spent)} / {money.format(limit)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("actions.edit")}
                    onClick={() => setEditing(budget)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    pending={deletingId === budget.id}
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate({ id: budget.id! })}
                    aria-label={t("actions.delete")}
                    title={t("actions.delete")}
                  >
                    <Trash2 />
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
    <div className="space-y-6">
      <PageHeader title={t("budgets.title")}>
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          {t("budgets.add")}
        </Button>
      </PageHeader>

      <Dialog open={addOpen} onOpenChange={setAddOpen} title={t("budgets.add")}>
        <CreateBudgetForm
          categories={categoryList}
          onCreated={() => {
            invalidate();
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Dialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={t("actions.edit")}
      >
        <CreateBudgetForm
          initial={editing ?? undefined}
          categories={categoryList}
          onCreated={() => {
            invalidate();
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      </Dialog>
      <section className="card overflow-hidden">{content}</section>
    </div>
  );
}
