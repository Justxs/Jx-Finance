import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Trash2, Pencil } from "lucide-react";
import { type ReactNode, useState, useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import {
  getBudgetsQueryKey,
  useDeleteBudget,
  useBudgetsSuspense,
  useCategoriesSuspense,
} from "@/api/generated";
import type { BudgetResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { RowTransition } from "@/components/row-transition";
import { SummaryStats } from "@/components/summary-stats";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/meter";
import { Tooltip } from "@/components/ui/tooltip";
import { useMoney, useMonthLabel } from "@/hooks/use-formatters";
import { useTodayDate } from "@/hooks/use-settings";
import { monthBounds } from "@/lib/calendar";
import { fromCents, toCents } from "@/lib/money";
import { optimisticRemoval } from "@/lib/optimistic";
import { CreateBudgetForm } from "../create-budget-form";

export function BudgetsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const money = useMoney();
  const monthLabel = useMonthLabel();
  const today = useTodayDate();
  const [editing, setEditing] = useState<BudgetResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const categories = useCategoriesSuspense();
  const budgets = useBudgetsSuspense();

  function openForm(budget: BudgetResponse | null) {
    setEditing(budget);
    setFormOpen(true);
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleteMutation = useDeleteBudget({
    mutation: optimisticRemoval<BudgetResponse>(queryClient, getBudgetsQueryKey()),
  });

  const budgetList = useDeferredValue(budgets.data);
  const categoryList = categories.data;

  const month = monthLabel(today);
  const { dateFrom, dateTo } = monthBounds(today);

  const spentCents = budgetList.reduce((sum, budget) => sum + toCents(budget.spent), 0);
  const limitCents = budgetList.reduce((sum, budget) => sum + toCents(budget.limitAmount), 0);
  const remainingCents = limitCents - spentCents;

  const deletingId = deleteMutation.isPending ? deleteMutation.variables?.id : undefined;

  let content: ReactNode;
  if (budgetList.length === 0) {
    content = <p className="py-6 text-sm text-muted-foreground">{t("budgets.empty")}</p>;
  } else {
    content = (
      <ul className="rows border-t border-t-rule">
        {budgetList.map((budget) => {
          const limit = Number(budget.limitAmount);
          const spent = Number(budget.spent);
          const overBudget = spent > limit;
          return (
            <RowTransition key={budget.id}>
              <li className="py-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <p className="min-w-0 font-medium wrap-break-word">
                    <Tooltip
                      content={t("dashboard.showTransactions", { category: budget.categoryName })}
                    >
                      <Link
                        to="/transactions"
                        search={{
                          page: 1,
                          categoryId: budget.categoryId,
                          type: "expense",
                          dateFrom,
                          dateTo,
                        }}
                        className="underline-offset-4 hover:underline"
                      >
                        {budget.categoryName}
                      </Link>
                    </Tooltip>
                  </p>
                  <div className="col-span-2 row-start-2 min-w-0 text-sm sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:text-right">
                    <p className="whitespace-nowrap tabular-nums">
                      <span className="font-semibold">{money.format(spent)}</span>{" "}
                      <span className="text-muted-foreground">
                        {t("budgets.ofLimit", { amount: money.format(limit) })}
                      </span>
                    </p>
                    <p
                      className={`text-xs tabular-nums ${overBudget ? "text-expense" : "text-muted-foreground"}`}
                    >
                      {overBudget
                        ? t("budgets.over", { amount: money.format(spent - limit) })
                        : t("budgets.left", { amount: money.format(limit - spent) })}
                    </p>
                  </div>
                  <div className="col-start-2 row-start-1 flex items-center sm:col-start-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${t("actions.edit")}: ${budget.categoryName}`}
                      tooltip={`${t("actions.edit")}: ${budget.categoryName}`}
                      onClick={() => openForm(budget)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      pending={deletingId === budget.id}
                      disabled={deleteMutation.isPending}
                      onClick={() => setDeleteTarget(budget.id)}
                      aria-label={`${t("actions.delete")}: ${budget.categoryName}`}
                      tooltip={`${t("actions.delete")}: ${budget.categoryName}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <Meter
                  value={spent}
                  max={limit}
                  tone={overBudget ? "negative" : "primary"}
                  label={budget.categoryName ?? undefined}
                  className="mt-2"
                />
              </li>
            </RowTransition>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader title={t("budgets.title")} description={month}>
        <Button onClick={() => openForm(null)}>
          <Plus />
          {t("budgets.add")}
        </Button>
      </PageHeader>

      <Modal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? t("actions.edit") : t("budgets.add")}
      >
        <CreateBudgetForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          categories={categoryList}
          onCreated={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
      {budgetList.length > 0 ? (
        <SummaryStats
          items={[
            { label: t("budgets.spentThisMonth"), value: fromCents(spentCents), lead: true },
            { label: t("budgets.budgeted"), value: fromCents(limitCents) },
            remainingCents < 0
              ? {
                  label: t("budgets.overBy"),
                  value: fromCents(-remainingCents),
                  tone: "text-expense",
                }
              : { label: t("budgets.remaining"), value: fromCents(remainingCents) },
          ]}
        />
      ) : null}
      {content}
      <ConfirmDeleteDialog
        target={deleteTarget}
        itemLabel={
          budgetList.find((budget) => budget.id === deleteTarget)?.categoryName ?? undefined
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate({ id })}
      />
    </div>
  );
}
