import { useTranslation } from "react-i18next";
import {
  getBudgetsQueryKey,
  useDeleteBudget,
  useBudgetsSuspense,
  useCategoriesSuspense,
  useTagsSuspense,
} from "@/api/generated";
import type { BudgetResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { EditModal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { PanelRows } from "@/components/panel-rows/panel-rows";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { BudgetForm } from "@/features/budgets/budget-form/budget-form";
import { BudgetRow } from "@/features/budgets/budget-row/budget-row";
import { BudgetSuggestions } from "@/features/budgets/budget-suggestions/budget-suggestions";
import { useEditableList } from "@/hooks/use-editable-list";
import { fromCents, toCents } from "@/lib/money";
import { optimisticRemoval } from "@/lib/optimistic";
import { EXPENSE_TONE } from "@/lib/tone";

export function BudgetsPage() {
  const { t } = useTranslation();
  const categoryList = useCategoriesSuspense().data;
  const tagList = useTagsSuspense().data;
  const budgets = useEditableList(
    useBudgetsSuspense().data,
    useDeleteBudget({ mutation: optimisticRemoval<BudgetResponse>(getBudgetsQueryKey()) }),
    (budget) => budget.name,
    "budget",
  );
  const budgetList = budgets.list;

  const spentCents = budgetList.reduce((sum, budget) => sum + toCents(budget.spent), 0);
  const limitCents = budgetList.reduce((sum, budget) => sum + toCents(budget.effectiveLimit), 0);
  const remainingCents = limitCents - spentCents;

  return (
    <div className="space-y-5">
      <PageHeader title={t("budgets.title")} description={t("budgets.subtitle")}>
        <CreateDialog label={t("budgets.add")} title={t("budgets.add")}>
          {(close) => <BudgetForm categories={categoryList} tags={tagList} onClose={close} />}
        </CreateDialog>
      </PageHeader>

      <EditModal
        {...budgets.editProps}
        title={t("budgets.editTitle")}
        description={(budget) => budget.name}
      >
        {(budget, close) => (
          <BudgetForm initial={budget} categories={categoryList} tags={tagList} onClose={close} />
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
      <PanelRows count={budgetList.length} emptyText={t("budgets.empty")}>
        {budgetList.map((budget) => (
          <BudgetRow key={budget.id} budget={budget} {...budgets.rowProps(budget)} />
        ))}
      </PanelRows>
      <QueryBoundary fallback={null}>
        <BudgetSuggestions />
      </QueryBoundary>
      <ConfirmDeleteDialog {...budgets.dialogProps} />
    </div>
  );
}
