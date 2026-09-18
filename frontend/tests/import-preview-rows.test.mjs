import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCategory,
  selectAllPatch,
  summarizeSelection,
  toPreviewRows,
} from "../src/features/imports/import-preview-table/preview-rows.ts";

const categories = [
  { id: "food", name: "Food", type: "expense" },
  { id: "transport", name: "Transport", type: "expense" },
  { id: "salary", name: "Salary", type: "income" },
];

function row(importRef, description, type, amount, flags = {}) {
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
    ...flags,
  };
}

function transaction(date, description, type, categoryId) {
  return { id: `${date}-${description}`, date, description, type, categoryId, amount: "1.00" };
}

test("category recall takes the most recent exact match of the same type", () => {
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

  assert.deepEqual(
    rows.map((item) => [item.categoryId, item.categorySuggested]),
    [
      ["transport", true],
      ["", false],
      ["", false],
      ["", false],
    ],
  );
});

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

  assert.equal(summarizeSelection(rows).selected, 2);
  assert.deepEqual(summarizeSelection(rows).nets, [{ currency: "eur", cents: 9563 }]);
  assert.equal(summarizeSelection(rows).allSelected, false);

  const all = selectAllPatch(rows, true);
  assert.deepEqual(
    all.map((item) => item.selected),
    [true, true, false, true],
  );
  assert.equal(summarizeSelection(all).allSelected, true);
  assert.deepEqual(summarizeSelection(all).nets, [{ currency: "eur", cents: -15437 }]);
  assert.equal(summarizeSelection(selectAllPatch(all, false)).selected, 0);
  assert.deepEqual(summarizeSelection(selectAllPatch(all, false)).nets, []);
});

test("the summary keeps one net per currency", () => {
  const rows = toPreviewRows(
    [
      row("1", "Lidl", "expense", "38.64"),
      row("2", "Dividend", "income", "42.50", { currency: "usd" }),
      row("3", "Broker fee", "expense", "2.50", { currency: "usd" }),
    ],
    [],
    categories,
  );

  assert.deepEqual(summarizeSelection(rows).nets, [
    { currency: "eur", cents: -3864 },
    { currency: "usd", cents: 4000 },
  ]);
});

test("bulk category only touches selected rows of the category type", () => {
  const rows = toPreviewRows(
    [row("1", "Lidl", "expense", "38.64"), row("2", "VMI", "income", "134.27")],
    [],
    categories,
  );
  const next = applyCategory(rows, categories[0]);
  assert.deepEqual(
    next.map((item) => item.categoryId),
    ["food", ""],
  );
});
