import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { ReportSummaryResponse } from "@/api/generated/model";
import { rollUpToGroups } from "@/components/category-breakdown/category-groups";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { TitledSection } from "@/components/ui/section/section";
import { MoneyFlowChart } from "@/features/reports/money-flow-chart";
import { useCategoryName } from "@/hooks/use-category-name";
import { useMoney } from "@/hooks/use-formatters";
import { toCents } from "@/lib/money";
import { type MoneyFlowKind, type MoneyFlowNode, moneyFlowGraph } from "./money-flow-graph";

const flowLabels = {
  hub: "reports.moneyFlow.moneyIn",
  other: "dashboard.other",
  moneyBack: "reports.moneyFlow.moneyBack",
  fromSavings: "reports.moneyFlow.fromSavings",
  saved: "reports.moneyFlow.saved",
} as const satisfies Record<Exclude<MoneyFlowKind, "income" | "expense">, string>;

interface Props {
  summary: ReportSummaryResponse;
}

export function MoneyFlow({ summary }: Readonly<Props>) {
  const { t } = useTranslation();
  const nameOf = useCategoryName();
  const money = useMoney();
  const navigate = useNavigate();

  const graph = moneyFlowGraph(summary);
  const empty = toCents(summary.totalIncome) === 0 && toCents(summary.totalExpense) === 0;

  function named(node: MoneyFlowNode): MoneyFlowNode {
    const label =
      node.kind === "income" || node.kind === "expense"
        ? nameOf({
            categoryId: node.categoryId,
            categoryName: node.label,
            syntheticGroup: node.syntheticGroup,
          })
        : t(flowLabels[node.kind]);
    return { ...node, label };
  }

  function amountOf(cents: number) {
    return money.format(cents / 100);
  }

  function handleSelect(node: MoneyFlowNode) {
    if (!node.categoryId) {
      return;
    }
    void navigate({
      to: "/transactions",
      search: {
        page: 1,
        categoryId: node.categoryId,
        type: node.kind === "income" ? "income" : "expense",
        dateFrom: summary.periodStart,
        dateTo: summary.periodEnd,
        spreadOverlap: true,
      },
    });
  }

  const nodes = graph.nodes.map(named);
  const moneyBack = graph.moneyBack.map(named);
  const moneyIn = nodes.find((node) => node.kind === "hub")?.cents ?? 0;
  const spentCategories = rollUpToGroups(summary.expenseByCategory).filter(
    (item) => toCents(item.amount) > 0,
  ).length;

  return (
    <TitledSection title={t("reports.moneyFlow.title")} bodyGap="md" className="hidden lg:block">
      {empty ? (
        <EmptyText>{t("charts.empty")}</EmptyText>
      ) : (
        <div className="space-y-3">
          <div
            role="img"
            aria-label={t("reports.moneyFlow.ariaLabel", {
              count: spentCategories,
              moneyIn: amountOf(moneyIn),
              spent: amountOf(moneyIn - graph.saved),
              saved: amountOf(graph.saved),
            })}
          >
            <MoneyFlowChart
              nodes={nodes}
              links={graph.links}
              moneyBack={moneyBack}
              onSelect={handleSelect}
            />
          </div>
          {moneyBack.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("reports.moneyFlow.moneyBackLine", {
                items: moneyBack.map((item) => `${item.label} ${amountOf(item.cents)}`).join(", "),
              })}
            </p>
          ) : null}
        </div>
      )}
    </TitledSection>
  );
}
