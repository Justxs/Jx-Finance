import { Link } from "@tanstack/react-router";
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
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { EditModal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { ProgressAmount, ProgressRow } from "@/components/progress-row/progress-row";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
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
                </>
              }
              meter={{ value: spent, max: limit, tone: overBudget ? "negative" : "primary" }}
              onEdit={() => setEditing(budget)}
              onDelete={() => remove.request(budget.id)}
              deletePending={remove.pendingId === budget.id}
              deleteDisabled={remove.busy}
            />
          );
        })}
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("budgets.title")} description={t("budgets.subtitle")}>
        <CreateDialog label={t("budgets.add")} title={t("budgets.add")}>
          {(close) => (
            <CreateBudgetForm categories={categoryList} onCreated={close} onCancel={close} />
          )}
        </CreateDialog>
      </PageHeader>

      <EditModal item={editing} title={t("actions.edit")} onClose={() => setEditing(null)}>
        {(budget) => (
          <CreateBudgetForm
            initial={budget}
            categories={categoryList}
            onCreated={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
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
