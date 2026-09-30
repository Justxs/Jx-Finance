import { expect, test } from "vitest";
import type { CategoryBreakdownItem } from "@/api/generated/model";
import { biggestChanges, monthRows } from "./year-review-rows";

function category(
  id: string,
  amount: string,
  comparisonAmount: string | null,
): CategoryBreakdownItem {
  return { categoryId: id, categoryName: id, categoryIcon: null, amount, comparisonAmount };
}

test("each month reads its net and the share of income kept", () => {
  const rows = monthRows([
    { bucketStart: "2026-01-01", income: "2000.00", expense: "1500.00" },
    { bucketStart: "2026-02-01", income: "0.00", expense: "300.10" },
  ]);

  expect(rows).toEqual([
    { month: "2026-01-01", income: 2000, expense: 1500, net: 500, savedShare: 0.25 },
    { month: "2026-02-01", income: 0, expense: 300.1, net: -300.1, savedShare: null },
  ]);
});

test("the biggest changes rank by size either way and skip the unchanged and the uncompared", () => {
  const rows = biggestChanges(
    [
      category("food", "4200.00", "3900.00"),
      category("travel", "800.00", "2400.00"),
      category("rent", "7200.00", "7200.00"),
      category("new", "50.00", null),
    ],
    2,
  );

  expect(rows.map((row) => row.categoryId)).toEqual(["travel", "food"]);
});
