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
import { budgetOverview } from "@/features/budgets/budget-overview";
import { BudgetRow } from "@/features/budgets/budget-row/budget-row";
import { BudgetSuggestions } from "@/features/budgets/budget-suggestions/budget-suggestions";
import { useEditableList } from "@/hooks/use-editable-list";
import { useMoney } from "@/hooks/use-formatters";
import { fromCents } from "@/lib/money";
import { optimisticRemoval } from "@/lib/optimistic";
import { EXPENSE_TONE } from "@/lib/tone";
import { useShare, withShare } from "@/stores/my-share-store";

function BudgetsSummary({ budgets }: Readonly<{ budgets: readonly BudgetResponse[] }>) {
  const { t } = useTranslation();
  const money = useMoney();
  const { over, overCents, periods } = budgetOverview(budgets);
  const leadPeriod = periods.find((totals) => totals.period === "monthly") ?? periods[0];

  const periodStats = periods.map((totals) => ({
    label: t(`budgets.summary.left.${totals.period}`),
    value: fromCents(totals.leftCents),
    detail: t("budgets.spentOf", {
      spent: money.format(totals.spentCents / 100),
      limit: money.format(totals.limitCents / 100),
    }),
    lead: over.length === 0 && totals === leadPeriod,
  }));

  if (over.length === 0) {
    return <SummaryStats items={periodStats} />;
  }

  return (
    <SummaryStats
      items={[
        {
          label: t("budgets.summary.over", { count: over.length, total: budgets.length }),
          value: fromCents(overCents),
          tone: EXPENSE_TONE,
          detail: over.map((budget) => budget.name).join(", "),
          lead: true,
        },
        ...periodStats,
      ]}
    />
  );
}

export function BudgetsPage() {
  const { t } = useTranslation();
  const categoryList = useCategoriesSuspense().data;
  const tagList = useTagsSuspense().data;
  const params = withShare(undefined, useShare());
  const budgets = useEditableList(
    useBudgetsSuspense(params).data,
    useDeleteBudget({ mutation: optimisticRemoval<BudgetResponse>(getBudgetsQueryKey(params)) }),
    (budget) => budget.name,
    "budget",
  );
  const budgetList = budgets.list;

  return (
    <div className="space-y-5">
      <PageHeader title={t("budgets.title")} description={t("budgets.subtitle")}>
        <CreateDialog label={t("budgets.add")} title={t("budgets.add")}>
          {(close) => <BudgetForm categories={categoryList} tags={tagList} onClose={close} />}
        </CreateDialog>
      </PageHeader>

      <EditModal
        {...budgets.editProps}
        title={(budget) => `${t("budgets.editTitle")}: ${budget.name}`}
      >
        {(budget, close) => (
          <BudgetForm initial={budget} categories={categoryList} tags={tagList} onClose={close} />
        )}
      </EditModal>
      {budgetList.length > 0 ? <BudgetsSummary budgets={budgetList} /> : null}
      <PanelRows count={budgetList.length} emptyText={t("budgets.empty")}>
        {budgetList.map((budget) => (
          <BudgetRow key={budget.id} budget={budget} {...budgets.rowProps(budget)} />
        ))}
      </PanelRows>
      <QueryBoundary fallback={null} errorSubject={t("budgets.suggestions.title")}>
        <BudgetSuggestions />
      </QueryBoundary>
      <ConfirmDeleteDialog {...budgets.dialogProps} />
    </div>
  );
}
