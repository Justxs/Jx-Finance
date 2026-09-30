import type {
  CategoryBreakdownItem,
  ReportSummaryResponse,
  SyntheticCategoryGroup,
} from "@/api/generated/model";
import { breakdownCut, rollUpToGroups } from "@/components/category-breakdown/category-groups";
import { toCents } from "@/lib/money";

export const MONEY_FLOW_HEIGHT = 360;

export type MoneyFlowKind =
  | "income"
  | "hub"
  | "expense"
  | "other"
  | "moneyBack"
  | "fromSavings"
  | "saved";

export interface MoneyFlowNode {
  kind: MoneyFlowKind;
  label: string;
  categoryId: string | null;
  syntheticGroup: SyntheticCategoryGroup | null;
  cents: number;
}

export interface MoneyFlowLink {
  source: number;
  target: number;
  value: number;
}

export interface MoneyFlowGraph {
  nodes: MoneyFlowNode[];
  links: MoneyFlowLink[];
  moneyBack: MoneyFlowNode[];
  fromSavings: number;
  saved: number;
}

function categoryNode(kind: "income" | "expense", item: CategoryBreakdownItem): MoneyFlowNode {
  return {
    kind,
    label: item.categoryName,
    categoryId: item.syntheticGroup ? null : item.categoryId,
    syntheticGroup: item.syntheticGroup ?? null,
    cents: toCents(item.amount),
  };
}

function flowNode(kind: MoneyFlowKind, cents: number): MoneyFlowNode {
  return { kind, label: "", categoryId: null, syntheticGroup: null, cents };
}

function centsOf(nodes: readonly { cents: number }[]) {
  return nodes.reduce((sum, node) => sum + node.cents, 0);
}

function cutNodes(kind: "income" | "expense", items: readonly CategoryBreakdownItem[]) {
  const { rows, rest } = breakdownCut(items);
  return [
    ...rows.map((item) => categoryNode(kind, item)),
    flowNode("other", centsOf(rest.map((item) => categoryNode(kind, item)))),
  ];
}

function isBelowZero(item: CategoryBreakdownItem) {
  return toCents(item.amount) < 0;
}

export function moneyFlowGraph(summary: ReportSummaryResponse): MoneyFlowGraph {
  const expenses = rollUpToGroups(summary.expenseByCategory);
  const incomes = rollUpToGroups(summary.incomeByCategory).filter((item) => !isBelowZero(item));
  const moneyBack = expenses
    .filter(isBelowZero)
    .map((item) => ({ ...categoryNode("expense", item), cents: -toCents(item.amount) }));

  const net = toCents(summary.totalIncome) - toCents(summary.totalExpense);
  const saved = Math.max(0, net);
  const fromSavings = Math.max(0, -net);

  const left = [
    ...cutNodes("income", incomes),
    flowNode("moneyBack", centsOf(moneyBack)),
    flowNode("fromSavings", fromSavings),
  ].filter((node) => node.cents > 0);
  const right = [
    ...cutNodes(
      "expense",
      expenses.filter((item) => !isBelowZero(item)),
    ),
    flowNode("saved", saved),
  ].filter((node) => node.cents > 0);
  const hub = left.length;

  return {
    nodes: [...left, flowNode("hub", centsOf(left)), ...right],
    links: [
      ...left.map((node, index) => ({ source: index, target: hub, value: node.cents })),
      ...right.map((node, index) => ({ source: hub, target: hub + 1 + index, value: node.cents })),
    ],
    moneyBack,
    fromSavings,
    saved,
  };
}
