import { expect, test } from "vitest";
import type { CategoryBreakdownItem } from "@/api/generated/model";
import { rollUpToGroups } from "./category-groups";

function item(overrides: Partial<CategoryBreakdownItem>): CategoryBreakdownItem {
  return {
    categoryId: "c",
    categoryName: "C",
    categoryIcon: null,
    amount: "0.00",
    syntheticGroup: null,
    comparisonAmount: null,
    parentId: null,
    parentName: null,
    parentIcon: null,
    ...overrides,
  };
}

test("sub-categories add up under their parent, even without spending of the parent's own", () => {
  const rows = rollUpToGroups([
    item({
      categoryId: "fuel",
      categoryName: "Fuel",
      amount: "60.00",
      parentId: "transport",
      parentName: "Transport",
      parentIcon: "bus",
    }),
    item({ categoryId: "food", categoryName: "Food", amount: "30.00" }),
    item({
      categoryId: "parking",
      categoryName: "Parking",
      amount: "5.00",
      parentId: "transport",
      parentName: "Transport",
      parentIcon: "bus",
    }),
  ]);

  expect(
    rows.map((row) => [row.categoryId, row.categoryName, row.categoryIcon, row.amount]),
  ).toEqual([
    ["transport", "Transport", "bus", "65.00"],
    ["food", "Food", null, "30.00"],
  ]);
});

test("the parent's own spending joins its group and comparisons add up when present", () => {
  const rows = rollUpToGroups([
    item({
      categoryId: "transport",
      categoryName: "Transport",
      amount: "2.00",
      comparisonAmount: "1.00",
    }),
    item({
      categoryId: "fuel",
      amount: "60.00",
      comparisonAmount: null,
      parentId: "transport",
      parentName: "Transport",
    }),
  ]);

  expect(rows).toHaveLength(1);
  expect([rows[0]!.amount, rows[0]!.comparisonAmount]).toEqual(["62.00", "1.00"]);
});

test("uncategorized and synthetic groups stay as they are", () => {
  const rows = rollUpToGroups([
    item({ categoryId: null, categoryName: "Uncategorized", amount: "4.00" }),
    item({ categoryId: null, syntheticGroup: "investmentTaxesAndFees", amount: "1.00" }),
  ]);

  expect(rows).toHaveLength(2);
});
