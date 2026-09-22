import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { freshModuleLoader } from "@/test/fresh-module";
import { blockStorage } from "@/test/preferences";
import { SAVED_FILTERS_STORAGE_KEY, TEMPLATES_STORAGE_KEY } from "./transaction-views";

const loadStore = await freshModuleLoader(() => import("./transaction-views"));

function seedRows(storageKey: string, rows: Record<string, unknown>[]) {
  const stored = Object.fromEntries(
    rows.map((row) => [`s:${String(row.id)}`, { versionKey: "seed", data: row }]),
  );
  localStorage.setItem(storageKey, JSON.stringify(stored));
}

function storedKeys(storageKey: string) {
  const raw = localStorage.getItem(storageKey);
  return raw ? Object.keys(JSON.parse(raw)) : [];
}

const groceries = { search: "lidl", type: "expense" as const };

describe("saved filters", () => {
  test("nothing stored gives an empty list and writes nothing", async () => {
    const store = await loadStore();

    expect(store.readSavedFilters()).toEqual([]);
    expect(localStorage.getItem(SAVED_FILTERS_STORAGE_KEY)).toBeNull();
  });

  test("a saved filter comes back with its name and filter", async () => {
    const store = await loadStore();

    const saved = store.saveFilter("  Groceries  ", groceries);

    expect(saved.name).toBe("Groceries");
    expect(store.readSavedFilters()).toEqual([
      { id: saved.id, name: "Groceries", filter: groceries },
    ]);
    expect(storedKeys(SAVED_FILTERS_STORAGE_KEY)).toEqual([`s:${saved.id}`]);
  });

  test("the list is ordered by name and the snapshot keeps its identity", async () => {
    const store = await loadStore();

    store.saveFilter("Zebra", groceries);
    store.saveFilter("Apples", groceries);

    const first = store.readSavedFilters();
    expect(first.map((row) => row.name)).toEqual(["Apples", "Zebra"]);
    expect(store.readSavedFilters()).toBe(first);

    store.saveFilter("Milk", groceries);

    expect(store.readSavedFilters()).not.toBe(first);
  });

  test("renaming trims the name and clamps it to the maximum length", async () => {
    const store = await loadStore();
    const saved = store.saveFilter("Groceries", groceries);

    store.renameSavedFilter(saved.id, `  ${"x".repeat(80)}  `);

    expect(store.readSavedFilters()[0]?.name).toHaveLength(store.SAVED_NAME_MAX_LENGTH);
  });

  test("deleting removes the row from storage", async () => {
    const store = await loadStore();
    const saved = store.saveFilter("Groceries", groceries);

    store.deleteSavedFilter(saved.id);

    expect(store.readSavedFilters()).toEqual([]);
    expect(storedKeys(SAVED_FILTERS_STORAGE_KEY)).toEqual([]);
  });

  test("a stored filter outside the schema falls back field by field", async () => {
    seedRows(SAVED_FILTERS_STORAGE_KEY, [
      {
        id: "stored-1",
        name: "Odd",
        filter: { search: "lidl", type: "transfer", dateFrom: 7 },
      },
    ]);

    const store = await loadStore();

    expect(store.readSavedFilters()).toEqual([
      { id: "stored-1", name: "Odd", filter: { search: "lidl" } },
    ]);
  });

  test("the hook follows writes", async () => {
    const store = await loadStore();
    const { result } = renderHook(() => store.useSavedFilters());

    act(() => {
      store.saveFilter("Groceries", groceries);
    });

    expect(result.current.map((row) => row.name)).toEqual(["Groceries"]);
  });
});

const weeklyShop = {
  accountId: "account-1",
  categoryId: null,
  type: "expense" as const,
  amount: "42.18",
  currency: "eur" as const,
  description: "Maxima",
  tagIds: ["tag-1"],
  lines: [
    { categoryId: "category-1", amount: "30.00", description: "Food" },
    { categoryId: null, amount: "12.18", description: null },
  ],
};

describe("transaction templates", () => {
  test("a template keeps its amount, tags and split lines", async () => {
    const store = await loadStore();

    const saved = store.saveTransactionTemplate("Weekly shop", weeklyShop);

    expect(store.readTransactionTemplates()).toEqual([
      { id: saved.id, name: "Weekly shop", values: weeklyShop },
    ]);
  });

  test("renaming and deleting work the same way as for a filter", async () => {
    const store = await loadStore();
    const saved = store.saveTransactionTemplate("Weekly shop", weeklyShop);

    store.renameTransactionTemplate(saved.id, "Monthly shop");
    expect(store.readTransactionTemplates()[0]?.name).toBe("Monthly shop");

    store.deleteTransactionTemplate(saved.id);
    expect(store.readTransactionTemplates()).toEqual([]);
  });

  test("a stored template outside the schema falls back field by field", async () => {
    seedRows(TEMPLATES_STORAGE_KEY, [
      {
        id: "stored-1",
        name: "Odd",
        values: { ...weeklyShop, currency: "xyz", type: "transfer", tagIds: "tag-1" },
      },
    ]);

    const store = await loadStore();

    expect(store.readTransactionTemplates()[0]?.values).toEqual({
      ...weeklyShop,
      currency: "eur",
      type: "expense",
      tagIds: [],
    });
  });

  test("the hook follows writes", async () => {
    const store = await loadStore();
    const { result } = renderHook(() => store.useTransactionTemplates());

    act(() => {
      store.saveTransactionTemplate("Weekly shop", weeklyShop);
    });

    expect(result.current.map((row) => row.name)).toEqual(["Weekly shop"]);
  });
});

describe("clearing", () => {
  test("clearTransactionViews empties both lists", async () => {
    const store = await loadStore();
    store.saveFilter("Groceries", groceries);
    store.saveTransactionTemplate("Weekly shop", weeklyShop);

    store.clearTransactionViews();

    expect(store.readSavedFilters()).toEqual([]);
    expect(store.readTransactionTemplates()).toEqual([]);
  });
});

describe("blocked storage", () => {
  test("saving still works for the session", async () => {
    blockStorage();

    const store = await loadStore();
    store.saveFilter("Groceries", groceries);

    expect(store.readSavedFilters().map((row) => row.name)).toEqual(["Groceries"]);
  });
});
