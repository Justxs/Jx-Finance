import { describe, expect, test } from "vitest";
import type {
  CategoryResponse,
  FlowType,
  ImportPreviewRow,
  TransactionResponse,
} from "@/api/generated/model";
import {
  applyCategory,
  categoryTargetCount,
  importDateRange,
  recallCategoryId,
  selectAllPatch,
  summarizeSelection,
  toPreviewRows,
} from "./preview-rows";

function category(id: string, name: string, type: FlowType): CategoryResponse {
  return { id, name, type, icon: null, isDefault: false, scope: "personal", householdId: null };
}

const food = category("food", "Food", "expense");
const categories = [
  food,
  category("transport", "Transport", "expense"),
  category("salary", "Salary", "income"),
];

function row(
  importRef: string,
  description: string | null,
  type: FlowType,
  amount: string,
  flags: Partial<ImportPreviewRow> = {},
): ImportPreviewRow {
  return {
    importRef,
    date: "2026-09-18",
    payee: null,
    description,
    amount,
    type,
    isDuplicate: false,
    looksLikeTransfer: false,
    currency: "eur",
    suggestedCategoryId: null,
    suggestedTagIds: [],
    matchedRuleName: null,
    ...flags,
  };
}

function transaction(
  date: string,
  description: string | null,
  type: FlowType,
  categoryId: string | null,
): TransactionResponse {
  return {
    id: `${date}-${description}`,
    accountId: "account",
    categoryId,
    type,
    amount: "1.00",
    date,
    description,
    source: "manual",
    isSplit: false,
    createdAt: `${date}T00:00:00Z`,
    lines: null,
    currency: "eur",
    reportingAmount: "1.00",
    tagIds: [],
    attachmentCount: 0,
  };
}

describe("category recall", () => {
  test("takes the most recent exact match of the same type", () => {
    const rows = toPreviewRows(
      [
        row("1", "TRAFI bilietas", "expense", "29.00"),
        row("2", "Trafi bilietas", "income", "29.00"),
        row("3", "Trafi", "expense", "5.00"),
        row("4", "Trafi bilietas", "expense", "29.00", { isDuplicate: true }),
      ],
      [
        transaction("2026-07-01", "Trafi bilietas", "expense", "food"),
        transaction("2026-08-01", " trafi bilietas ", "expense", "transport"),
        transaction("2026-08-15", "Trafi bilietas", "expense", null),
      ],
      categories,
    );

    expect(rows.map((item) => [item.categoryId, item.categorySuggested])).toEqual([
      ["transport", true],
      ["", false],
      ["", false],
      ["", false],
    ]);
  });

  test("rows without a description recall nothing", () => {
    const history = [transaction("2026-08-01", null, "expense", "food")];

    expect(recallCategoryId(row("1", null, "expense", "1.00"), history, categories)).toBe("");
    expect(recallCategoryId(row("2", "   ", "expense", "1.00"), history, categories)).toBe("");
  });

  test("ignores history whose category is gone or of the other type", () => {
    const history = [
      transaction("2026-08-02", "Lidl", "expense", "deleted"),
      transaction("2026-08-01", "Lidl", "expense", "salary"),
    ];

    expect(recallCategoryId(row("1", "Lidl", "expense", "1.00"), history, categories)).toBe("");
  });
});

describe("rule suggestions", () => {
  test("a matching rule fills the category and the tags and beats the recall", () => {
    const rows = toPreviewRows(
      [
        row("1", "Trafi bilietas", "expense", "29.00", {
          suggestedCategoryId: "transport",
          suggestedTagIds: ["commute"],
          matchedRuleName: "Transport",
        }),
      ],
      [transaction("2026-08-01", "Trafi bilietas", "expense", "food")],
      categories,
    );

    expect(rows[0]).toMatchObject({
      categoryId: "transport",
      categorySuggested: true,
      ruleName: "Transport",
      tagIds: ["commute"],
    });
  });

  test("a rule that only adds tags leaves the recall to pick the category", () => {
    const rows = toPreviewRows(
      [
        row("1", "Trafi bilietas", "expense", "29.00", {
          suggestedTagIds: ["commute"],
          matchedRuleName: "Commuting",
        }),
      ],
      [transaction("2026-08-01", "Trafi bilietas", "expense", "food")],
      categories,
    );

    expect(rows[0]).toMatchObject({
      categoryId: "food",
      ruleName: "Commuting",
      tagIds: ["commute"],
    });
  });

  test("a duplicate row is left untouched by its rule", () => {
    const rows = toPreviewRows(
      [
        row("1", "Trafi bilietas", "expense", "29.00", {
          isDuplicate: true,
          suggestedCategoryId: "transport",
          suggestedTagIds: ["commute"],
          matchedRuleName: "Transport",
        }),
      ],
      [],
      categories,
    );

    expect(rows[0]).toMatchObject({ categoryId: "", ruleName: null, tagIds: [] });
  });
});

describe("initial state", () => {
  test("duplicates and likely transfers start unselected", () => {
    const rows = toPreviewRows(
      [
        row("1", "Lidl", "expense", "1.00"),
        row("2", "Maxima", "expense", "1.00", { isDuplicate: true }),
        row("3", "Savings", "expense", "1.00", { looksLikeTransfer: true }),
      ],
      [],
      categories,
    );

    expect(rows.map((item) => item.selected)).toEqual([true, false, false]);
    expect(rows.map((item) => item.transferAccountId + item.existingTransferId)).toEqual([
      "",
      "",
      "",
    ]);
  });
});

describe("selection summary", () => {
  test("select all leaves duplicates alone and the summary nets selected rows", () => {
    const rows = toPreviewRows(
      [
        row("1", "Lidl", "expense", "38.64"),
        row("2", "VMI", "income", "134.27"),
        row("3", "Maxima", "expense", "42.18", { isDuplicate: true }),
        row("4", "Savings", "expense", "250.00", { looksLikeTransfer: true }),
      ],
      [],
      categories,
    );

    expect(summarizeSelection(rows)).toEqual({
      total: 4,
      selected: 2,
      duplicates: 1,
      transfers: 1,
      nets: [{ currency: "eur", cents: 9563 }],
      allSelected: false,
      someSelected: true,
      selectableCount: 3,
    });

    const all = selectAllPatch(rows, true);
    expect(all.map((item) => item.selected)).toEqual([true, true, false, true]);
    expect(summarizeSelection(all).allSelected).toBe(true);
    expect(summarizeSelection(all).nets).toEqual([{ currency: "eur", cents: -15437 }]);

    const none = selectAllPatch(all, false);
    expect(summarizeSelection(none).selected).toBe(0);
    expect(summarizeSelection(none).someSelected).toBe(false);
    expect(summarizeSelection(none).nets).toEqual([]);
  });

  test("keeps one net per currency", () => {
    const rows = toPreviewRows(
      [
        row("1", "Lidl", "expense", "38.64"),
        row("2", "Dividend", "income", "42.50", { currency: "usd" }),
        row("3", "Broker fee", "expense", "2.50", { currency: "usd" }),
      ],
      [],
      categories,
    );

    expect(summarizeSelection(rows).nets).toEqual([
      { currency: "eur", cents: -3864 },
      { currency: "usd", cents: 4000 },
    ]);
  });

  test("sums in whole cents and reads comma decimals", () => {
    const rows = toPreviewRows(
      [row("1", "A", "income", "0,10"), row("2", "B", "income", "0.20")],
      [],
      categories,
    );

    expect(summarizeSelection(rows).nets).toEqual([{ currency: "eur", cents: 30 }]);
  });

  test("rows assigned to a transfer account count as transfers", () => {
    const rows = toPreviewRows([row("1", "To savings", "expense", "50.00")], [], categories).map(
      (item) => ({ ...item, transferAccountId: "savings" }),
    );

    expect(summarizeSelection(rows).transfers).toBe(1);
  });

  test("an import of only duplicates has nothing to select", () => {
    const rows = toPreviewRows(
      [row("1", "Lidl", "expense", "1.00", { isDuplicate: true })],
      [],
      categories,
    );

    expect(summarizeSelection(rows)).toMatchObject({ allSelected: false, selectableCount: 0 });
    expect(summarizeSelection([]).allSelected).toBe(false);
  });
});

describe("bulk category", () => {
  test("only touches selected rows of the category type", () => {
    const rows = toPreviewRows(
      [row("1", "Lidl", "expense", "38.64"), row("2", "VMI", "income", "134.27")],
      [],
      categories,
    );

    expect(applyCategory(rows, food).map((item) => item.categoryId)).toEqual(["food", ""]);
    expect(categoryTargetCount(rows, food)).toBe(1);
  });

  test("skips unselected rows and rows turned into transfers", () => {
    const rows = toPreviewRows(
      [
        row("1", "Lidl", "expense", "1.00"),
        row("2", "Maxima", "expense", "1.00"),
        row("3", "Iki", "expense", "1.00"),
      ],
      [],
      categories,
    ).map((item, index) => ({
      ...item,
      selected: index !== 1,
      transferAccountId: index === 2 ? "savings" : "",
    }));

    expect(applyCategory(rows, food).map((item) => item.categoryId)).toEqual(["food", "", ""]);
    expect(categoryTargetCount(rows, food)).toBe(1);
  });

  test("a manual pick clears the suggested mark", () => {
    const rows = toPreviewRows(
      [row("1", "Lidl", "expense", "1.00")],
      [transaction("2026-08-01", "Lidl", "expense", "transport")],
      categories,
    );

    expect(rows[0]).toMatchObject({ categoryId: "transport", categorySuggested: true });
    expect(applyCategory(rows, food)[0]).toMatchObject({
      categoryId: "food",
      categorySuggested: false,
    });
  });
});

describe("importDateRange", () => {
  test("spans the earliest to the latest row", () => {
    const rows = toPreviewRows(
      [
        row("1", "B", "expense", "1.00", { date: "2026-09-10" }),
        row("2", "A", "expense", "1.00", { date: "2026-08-28" }),
        row("3", "C", "expense", "1.00", { date: "2026-09-18" }),
      ],
      [],
      categories,
    );

    expect(importDateRange(rows)).toEqual({ dateFrom: "2026-08-28", dateTo: "2026-09-18" });
  });

  test("is blank without rows", () => {
    expect(importDateRange([])).toEqual({ dateFrom: "", dateTo: "" });
  });
});
