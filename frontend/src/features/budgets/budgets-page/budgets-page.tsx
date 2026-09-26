import { Link } from "@tanstack/react-router";
import { useState, useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import {
  getBudgetsQueryKey,
  useDeleteBudget,
  useBudgetsSuspense,
  useCategoriesSuspense,
} from "@/api/generated";
import type { BudgetResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { EditModal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { PanelRows } from "@/components/panel-rows/panel-rows";
import { ProgressAmount, ProgressRow } from "@/components/progress-row/progress-row";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { TitledSection } from "@/components/ui/section/section";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { fromCents, toCents } from "@/lib/money";
import { optimisticRemoval } from "@/lib/optimistic";
import { EXPENSE_TONE } from "@/lib/tone";
import { budgetPeriodLabel } from "../budget-periods";
import { BudgetRemaining, budgetFigures } from "../budget-remaining";
import { BudgetUsageChart } from "../budget-usage-chart";
import { CreateBudgetForm } from "../create-budget-form/create-budget-form";

export function BudgetsPage() {
  const { t } = useTranslation();
  const money = useMoney();
  const isoDate = useIsoDate();
  const [editing, setEditing] = useState<BudgetResponse | null>(null);

  const categories = useCategoriesSuspense();
  const budgets = useBudgetsSuspense();

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

  return (
    <div className="space-y-5">
      <PageHeader title={t("budgets.title")} description={t("budgets.subtitle")}>
        <CreateDialog label={t("budgets.add")} title={t("budgets.add")}>
          {(close) => <CreateBudgetForm categories={categoryList} onClose={close} />}
        </CreateDialog>
      </PageHeader>

      <EditModal item={editing} title={t("actions.edit")} onClose={() => setEditing(null)}>
        {(budget, close) => (
          <CreateBudgetForm initial={budget} categories={categoryList} onClose={close} />
        )}
      </EditModal>
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
        <TitledSection title={t("budgets.usage")} bodyGap="md">
          <BudgetUsageChart budgets={budgetList} />
        </TitledSection>
      ) : null}
      <PanelRows count={budgetList.length} emptyText={t("budgets.empty")}>
        {budgetList.map((budget) => {
          const { spent, limit, over } = budgetFigures(budget);
          return (
            <ProgressRow
              key={budget.id}
              label={budget.categoryName}
              title={
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
              primary={
                <ProgressAmount
                  amount={money.format(spent)}
                  of={t("budgets.ofLimit", { amount: money.format(limit) })}
                />
              }
              secondary={
                <>
                  <BudgetRemaining spent={spent} limit={limit} className="block" />
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
              onEdit={() => setEditing(budget)}
              {...remove.deleteProps(budget.id)}
            />
          );
        })}
      </PanelRows>
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
