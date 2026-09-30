import { describe, expect, test } from "vitest";
import type { CategoryBreakdownItem, ReportSummaryResponse } from "@/api/generated/model";
import { breakdownCut, rollUpToGroups } from "@/components/category-breakdown/category-groups";
import { breakdownWeight } from "@/lib/comparison";
import { fromCents, toCents } from "@/lib/money";
import { type MoneyFlowGraph, moneyFlowGraph } from "./money-flow-graph";

function item(
  categoryId: string | null,
  amount: string,
  overrides: Partial<CategoryBreakdownItem> = {},
): CategoryBreakdownItem {
  return {
    categoryId,
    categoryName: categoryId ?? "Uncategorized",
    categoryIcon: null,
    amount,
    ...overrides,
  };
}

function summaryOf(
  income: CategoryBreakdownItem[],
  expense: CategoryBreakdownItem[],
): ReportSummaryResponse {
  const totalIncome = income.reduce((sum, entry) => sum + toCents(entry.amount), 0);
  const totalExpense = expense.reduce((sum, entry) => sum + toCents(entry.amount), 0);
  return {
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    totalIncome: fromCents(totalIncome),
    totalExpense: fromCents(totalExpense),
    net: fromCents(totalIncome - totalExpense),
    incomeByCategory: income,
    expenseByCategory: expense,
    trend: [],
    trendBucket: "day",
    expenseByTag: [],
    expenseByPayee: [],
  };
}

function hubSides(graph: MoneyFlowGraph) {
  const hub = graph.nodes.findIndex((node) => node.kind === "hub");
  const into = graph.links.filter((link) => link.target === hub);
  const out = graph.links.filter((link) => link.source === hub);
  return {
    into: into.reduce((sum, link) => sum + link.value, 0),
    out: out.reduce((sum, link) => sum + link.value, 0),
    hub: graph.nodes[hub]!.cents,
  };
}

function kinds(graph: MoneyFlowGraph) {
  return graph.nodes.map((node) => node.kind);
}

const salary = [item("salary", "3200.10"), item("side", "150.45")];

describe("the hub balances to the cent", () => {
  test.each([
    ["surplus", salary, [item("food", "812.33"), item("rent", "1100.00")]],
    ["deficit", [item("salary", "900.01")], [item("food", "812.33"), item("rent", "1100.00")]],
    ["exact", [item("salary", "1912.33")], [item("food", "812.33"), item("rent", "1100.00")]],
    [
      "money back",
      salary,
      [item("food", "812.33"), item("electronics", "-40.07"), item("rent", "1100.00")],
    ],
  ])("%s", (_, income, expense) => {
    const sides = hubSides(moneyFlowGraph(summaryOf(income, expense)));

    expect(sides.into).toBe(sides.out);
    expect(sides.hub).toBe(sides.into);
  });
});

test("saved equals the net of the totals whenever it is positive, money back included", () => {
  const summary = summaryOf(salary, [item("food", "812.33"), item("electronics", "-40.07")]);
  const graph = moneyFlowGraph(summary);

  expect(graph.saved).toBe(toCents(summary.totalIncome) - toCents(summary.totalExpense));
  expect(graph.fromSavings).toBe(0);
  expect(graph.nodes.find((node) => node.kind === "saved")?.cents).toBe(graph.saved);
});

test("more than five categories fold into Other", () => {
  const expense = Array.from({ length: 8 }, (_, index) =>
    item(`category-${index}`, String(100 - index)),
  );
  const graph = moneyFlowGraph(summaryOf([item("salary", "2000.00")], expense));
  const right = graph.nodes.slice(graph.nodes.findIndex((node) => node.kind === "hub") + 1);

  expect(right.map((node) => node.categoryId)).toEqual([
    "category-0",
    "category-1",
    "category-2",
    "category-3",
    "category-4",
    null,
    null,
  ]);
  expect(right.map((node) => node.kind).slice(5)).toEqual(["other", "saved"]);
  expect(right[5]!.cents).toBe(toCents("95") + toCents("94") + toCents("93"));
});

test("with a comparison the graph keeps the rows the list shows", () => {
  const expense = [
    item("a", "500.00", { comparisonAmount: "10.00" }),
    item("b", "400.00", { comparisonAmount: "10.00" }),
    item("c", "300.00", { comparisonAmount: "10.00" }),
    item("d", "200.00", { comparisonAmount: "10.00" }),
    item("e", "150.00", { comparisonAmount: "10.00" }),
    item("f", "20.00", { comparisonAmount: "900.00" }),
  ];
  const graph = moneyFlowGraph(summaryOf([item("salary", "3000.00")], expense));
  const listRows = breakdownCut(expense).rows.map((row) => row.categoryId);

  expect(listRows).toContain("f");
  expect(listRows).not.toContain("e");
  expect(
    graph.nodes.filter((node) => node.kind === "expense").map((node) => node.categoryId),
  ).toEqual(listRows);
});

test("breakdownCut gives the list the same rows as before the extraction", () => {
  const expense = [
    item("fuel", "60.00", { parentId: "transport", parentName: "Transport" }),
    item("food", "80.00", { comparisonAmount: "30.00" }),
    item("parking", "5.00", { parentId: "transport", parentName: "Transport" }),
    item("health", "0.00", { comparisonAmount: "184.40" }),
    item("rent", "900.00"),
    item("fun", "12.00"),
    item("clothes", "-35.00"),
    item(null, "7.00"),
  ];
  const before = rollUpToGroups(expense).toSorted(
    (a, b) => breakdownWeight(b) - breakdownWeight(a),
  );

  expect(breakdownCut(expense)).toEqual({ rows: before.slice(0, 5), rest: before.slice(5) });
});

test("a refund-heavy child stays inside its positive group", () => {
  const graph = moneyFlowGraph(
    summaryOf(salary, [
      item("tv", "-40.00", { parentId: "home", parentName: "Home" }),
      item("sofa", "300.00", { parentId: "home", parentName: "Home" }),
      item("food", "100.00"),
    ]),
  );

  expect(graph.moneyBack).toEqual([]);
  expect(kinds(graph)).not.toContain("moneyBack");
  expect(graph.nodes.find((node) => node.categoryId === "home")?.cents).toBe(26000);
});

test("a refund-heavy category becomes money back on the left", () => {
  const graph = moneyFlowGraph(
    summaryOf(salary, [item("electronics", "-40.00"), item("food", "100.00")]),
  );

  expect(graph.moneyBack.map((node) => [node.categoryId, node.cents])).toEqual([
    ["electronics", 4000],
  ]);
  expect(kinds(graph)).toEqual(["income", "income", "moneyBack", "hub", "expense", "saved"]);
});

test("synthetic groups and uncategorized carry no category id", () => {
  const graph = moneyFlowGraph(
    summaryOf(
      [
        item("salary", "1000.00"),
        item(null, "38.16", {
          syntheticGroup: "investmentIncome",
          categoryName: "Investment income",
        }),
      ],
      [
        item(null, "12.00"),
        item(null, "5.72", {
          syntheticGroup: "investmentTaxesAndFees",
          categoryName: "Investment taxes and fees",
        }),
      ],
    ),
  );
  const unlinked = graph.nodes.filter((node) => node.categoryId === null);

  expect(
    graph.nodes.filter((node) => node.categoryId !== null).map((node) => node.categoryId),
  ).toEqual(["salary"]);
  expect(unlinked.map((node) => node.syntheticGroup)).toEqual([
    "investmentIncome",
    null,
    null,
    "investmentTaxesAndFees",
    null,
  ]);
});

test("a period with only expenses is paid from savings in full", () => {
  const graph = moneyFlowGraph(summaryOf([], [item("food", "80.00"), item("rent", "700.00")]));

  expect(graph.fromSavings).toBe(78000);
  expect(graph.saved).toBe(0);
  expect(kinds(graph)).toEqual(["fromSavings", "hub", "expense", "expense"]);
});
