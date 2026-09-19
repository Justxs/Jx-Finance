import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";
import type { CategoryResponse } from "@/api/generated/model";
import {
  isOptimistic,
  optimisticId,
  transactionCategoryLabel,
  transactionName,
} from "./transaction-row";

const t = ((key: string) => key) as unknown as TFunction;

const food: CategoryResponse = {
  id: "food",
  name: "Food",
  type: "expense",
  icon: null,
  isDefault: false,
  scope: "personal",
  householdId: null,
};

const categoryById = new Map<string | undefined, CategoryResponse | undefined>([["food", food]]);

describe("optimistic rows", () => {
  test("ids made for optimistic rows are recognised", () => {
    expect(optimisticId(3)).toBe("optimistic-3");
    expect(isOptimistic({ id: optimisticId("abc") })).toBe(true);
  });

  test("server ids are not optimistic", () => {
    expect(isOptimistic({ id: "0198c0de-optimistic-1" })).toBe(false);
  });
});

describe("transactionCategoryLabel", () => {
  test("split rows say so regardless of category", () => {
    expect(transactionCategoryLabel({ isSplit: true, categoryId: "food" }, categoryById, t)).toBe(
      "transactions.split",
    );
  });

  test("uses the category name", () => {
    expect(transactionCategoryLabel({ isSplit: false, categoryId: "food" }, categoryById, t)).toBe(
      "Food",
    );
  });

  test("missing or unknown categories are uncategorized", () => {
    for (const categoryId of [null, "gone"]) {
      expect(transactionCategoryLabel({ isSplit: false, categoryId }, categoryById, t)).toBe(
        "transactions.uncategorized",
      );
    }
  });
});

describe("transactionName", () => {
  test("prefers the description", () => {
    expect(
      transactionName({ description: "Lidl", isSplit: false, categoryId: "food" }, categoryById, t),
    ).toBe("Lidl");
  });

  test("falls back to the category label when the description is empty", () => {
    for (const description of [null, ""]) {
      expect(
        transactionName({ description, isSplit: false, categoryId: "food" }, categoryById, t),
      ).toBe("Food");
    }
  });
});
