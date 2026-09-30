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

    expect(store.savedFilters.read()).toEqual([]);
    expect(localStorage.getItem(SAVED_FILTERS_STORAGE_KEY)).toBeNull();
  });

  test("a saved filter comes back with its name and filter", async () => {
    const store = await loadStore();

    const saved = store.savedFilters.save("  Groceries  ", { filter: groceries });

    expect(saved.name).toBe("Groceries");
    expect(store.savedFilters.read()).toEqual([
      { id: saved.id, name: "Groceries", filter: groceries },
    ]);
    expect(storedKeys(SAVED_FILTERS_STORAGE_KEY)).toEqual([`s:${saved.id}`]);
  });

  test("the list is ordered by name and the hook keeps its snapshot identity", async () => {
    const store = await loadStore();
    store.savedFilters.save("Zebra", { filter: groceries });
    store.savedFilters.save("Apples", { filter: groceries });

    const { result, rerender } = renderHook(() => store.savedFilters.useRows());
    const first = result.current;
    expect(first.map((row) => row.name)).toEqual(["Apples", "Zebra"]);
    expect(store.savedFilters.read().map((row) => row.name)).toEqual(["Apples", "Zebra"]);

    rerender();
    expect(result.current).toBe(first);

    act(() => {
      store.savedFilters.save("Milk", { filter: groceries });
    });

    expect(result.current.map((row) => row.name)).toEqual(["Apples", "Milk", "Zebra"]);
  });

  test("renaming trims the name and clamps it to the maximum length", async () => {
    const store = await loadStore();
    const saved = store.savedFilters.save("Groceries", { filter: groceries });

    store.savedFilters.rename(saved.id, `  ${"x".repeat(80)}  `);

    expect(store.savedFilters.read()[0]?.name).toHaveLength(store.SAVED_NAME_MAX_LENGTH);
  });

  test("deleting removes the row from storage", async () => {
    const store = await loadStore();
    const saved = store.savedFilters.save("Groceries", { filter: groceries });

    store.savedFilters.remove(saved.id);

    expect(store.savedFilters.read()).toEqual([]);
    expect(storedKeys(SAVED_FILTERS_STORAGE_KEY)).toEqual([]);
  });

  test("a stored filter outside the schema falls back field by field", async () => {
    seedRows(SAVED_FILTERS_STORAGE_KEY, [
      {
        id: "stored-1",
        name: "Odd",
        filter: {
          search: "lidl",
          type: "transfer",
          dateFrom: 7,
          dateTo: "soon",
          accountId: "account-1",
        },
      },
    ]);

    const store = await loadStore();

    expect(store.savedFilters.read()).toEqual([
      { id: "stored-1", name: "Odd", filter: { search: "lidl" } },
    ]);
  });

  test("a payee filter is kept and one saved before payees existed still parses", async () => {
    seedRows(SAVED_FILTERS_STORAGE_KEY, [
      { id: "stored-1", name: "Maxima", filter: { payee: "maxima lt uab", type: "expense" } },
      { id: "stored-2", name: "Older", filter: { search: "lidl" } },
    ]);

    const store = await loadStore();

    expect(store.savedFilters.read()).toEqual([
      { id: "stored-1", name: "Maxima", filter: { payee: "maxima lt uab", type: "expense" } },
      { id: "stored-2", name: "Older", filter: { search: "lidl" } },
    ]);
  });

  test("the hook follows writes", async () => {
    const store = await loadStore();
    const { result } = renderHook(() => store.savedFilters.useRows());

    act(() => {
      store.savedFilters.save("Groceries", { filter: groceries });
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

    const saved = store.transactionTemplates.save("Weekly shop", { values: weeklyShop });

    expect(store.transactionTemplates.read()).toEqual([
      { id: saved.id, name: "Weekly shop", values: weeklyShop },
    ]);
  });

  test("renaming and deleting work the same way as for a filter", async () => {
    const store = await loadStore();
    const saved = store.transactionTemplates.save("Weekly shop", { values: weeklyShop });

    store.transactionTemplates.rename(saved.id, "Monthly shop");
    expect(store.transactionTemplates.read()[0]?.name).toBe("Monthly shop");

    store.transactionTemplates.remove(saved.id);
    expect(store.transactionTemplates.read()).toEqual([]);
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

    expect(store.transactionTemplates.read()[0]?.values).toEqual({
      ...weeklyShop,
      currency: "eur",
      type: "expense",
      tagIds: [],
    });
  });

  test("the hook follows writes", async () => {
    const store = await loadStore();
    const { result } = renderHook(() => store.transactionTemplates.useRows());

    act(() => {
      store.transactionTemplates.save("Weekly shop", { values: weeklyShop });
    });

    expect(result.current.map((row) => row.name)).toEqual(["Weekly shop"]);
  });
});

describe("clearing", () => {
  test("clearTransactionViews empties both lists", async () => {
    const store = await loadStore();
    store.savedFilters.save("Groceries", { filter: groceries });
    store.transactionTemplates.save("Weekly shop", { values: weeklyShop });

    store.clearTransactionViews();

    expect(store.savedFilters.read()).toEqual([]);
    expect(store.transactionTemplates.read()).toEqual([]);
  });
});

describe("blocked storage", () => {
  test("saving still works for the session", async () => {
    blockStorage();

    const store = await loadStore();
    store.savedFilters.save("Groceries", { filter: groceries });

    expect(store.savedFilters.read().map((row) => row.name)).toEqual(["Groceries"]);
  });
});
