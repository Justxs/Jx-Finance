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
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { RowTransition } from "@/components/row-transition/row-transition";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Meter } from "@/components/ui/meter/meter";
import { Rows } from "@/components/ui/rows/rows";
import { Panel, Section, SectionTitle } from "@/components/ui/section/section";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { fromCents, toCents } from "@/lib/money";
import { optimisticRemoval } from "@/lib/optimistic";
import { EXPENSE_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { budgetPeriodLabel } from "../budget-periods";
import { BudgetUsageChart } from "../budget-usage-chart";
import { CreateBudgetForm } from "../create-budget-form/create-budget-form";

export function BudgetsPage() {
  const { t } = useTranslation();
  const money = useMoney();
  const isoDate = useIsoDate();
  const [editing, setEditing] = useState<BudgetResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const categories = useCategoriesSuspense();
  const budgets = useBudgetsSuspense();

  function openForm(budget: BudgetResponse | null) {
    setEditing(budget);
    setFormOpen(true);
  }

  const deleteMutation = useDeleteBudget({
    mutation: optimisticRemoval<BudgetResponse>(getBudgetsQueryKey()),
  });

  const budgetList = useDeferredValue(budgets.data);
  const remove = useConfirmedDelete(
    deleteMutation,
    budgetList,
    (budget) => budget.categoryName,
    "budget",
  );
  const categoryList = categories.data;

  const spentCents = budgetList.reduce((sum, budget) => sum + toCents(budget.spent), 0);
  const limitCents = budgetList.reduce((sum, budget) => sum + toCents(budget.effectiveLimit), 0);
  const remainingCents = limitCents - spentCents;

  let content: ReactNode;
  if (budgetList.length === 0) {
    content = <EmptyText>{t("budgets.empty")}</EmptyText>;
  } else {
    content = (
      <Panel as={Rows} className="py-2 sm:py-3">
        {budgetList.map((budget) => {
          const limit = Number(budget.effectiveLimit);
          const spent = Number(budget.spent);
          const overBudget = spent > limit;
          return (
            <RowTransition key={budget.id}>
              <li className="py-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <div className="min-w-0">
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
                            dateFrom: budget.windowStart,
                            dateTo: budget.windowEnd,
                          }}
                          className="underline-offset-4 hover:underline"
                        >
                          {budget.categoryName}
                        </Link>
                      </Tooltip>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("budgets.windowLabel", {
                        period: budgetPeriodLabel(t, budget.period),
                        from: isoDate(budget.windowStart),
                        to: isoDate(budget.windowEnd),
                      })}
                    </p>
                  </div>
                  <div className="col-span-2 row-start-2 min-w-0 text-sm sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:text-right">
                    <p className="whitespace-nowrap tabular-nums">
                      <span className="font-semibold">{money.format(spent)}</span>{" "}
                      <span className="text-muted-foreground">
                        {t("budgets.ofLimit", { amount: money.format(limit) })}
                      </span>
                    </p>
                    <p
                      className={cn(
                        "text-xs tabular-nums",
                        overBudget ? EXPENSE_TONE : "text-muted-foreground",
                      )}
                    >
                      {overBudget
                        ? t("budgets.over", { amount: money.format(spent - limit) })
                        : t("budgets.left", { amount: money.format(limit - spent) })}
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
                  </div>
                  <div className="col-start-2 row-start-1 flex items-center sm:col-start-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${t("actions.edit")}: ${budget.categoryName}`}
                      onClick={() => openForm(budget)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      pending={remove.pendingId === budget.id}
                      disabled={remove.busy}
                      onClick={() => remove.request(budget.id)}
                      aria-label={`${t("actions.delete")}: ${budget.categoryName}`}
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
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("budgets.title")} description={t("budgets.subtitle")}>
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
            { label: t("budgets.spentInWindow"), value: fromCents(spentCents), lead: true },
            { label: t("budgets.budgeted"), value: fromCents(limitCents) },
            remainingCents < 0
              ? {
                  label: t("budgets.overBy"),
                  value: fromCents(-remainingCents),
                  tone: EXPENSE_TONE,
                }
              : { label: t("budgets.remaining"), value: fromCents(remainingCents) },
          ]}
        />
      ) : null}
      {budgetList.length > 1 ? (
        <Section>
          <SectionTitle className="mb-4">{t("budgets.usage")}</SectionTitle>
          <BudgetUsageChart budgets={budgetList} />
        </Section>
      ) : null}
      {content}
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
