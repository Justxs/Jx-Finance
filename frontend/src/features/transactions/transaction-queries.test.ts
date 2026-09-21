import { describe, expect, test } from "vitest";
import {
  isEmptyFilter,
  missingFilterReferences,
  transactionFilterParams,
} from "./transaction-queries";

const known = {
  accountIds: new Set(["account-1"]),
  categoryIds: new Set(["category-1"]),
  tagIds: new Set(["tag-1", "tag-2"]),
};

describe("transactionFilterParams", () => {
  test("keeps the filter and drops the page, the sort and its direction", () => {
    expect(
      transactionFilterParams({
        page: 3,
        search: "lidl",
        accountId: "account-1",
        sort: "amount",
        direction: "desc",
      }),
    ).toEqual({
      search: "lidl",
      accountId: "account-1",
      categoryId: undefined,
      tagIds: undefined,
      type: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
  });
});

describe("isEmptyFilter", () => {
  test("a view with nothing chosen is empty", () => {
    expect(isEmptyFilter(transactionFilterParams({ page: 1 }))).toBe(true);
  });

  test("one chosen value is enough", () => {
    expect(isEmptyFilter(transactionFilterParams({ page: 1, type: "income" }))).toBe(false);
  });
});

describe("missingFilterReferences", () => {
  test("a filter naming only known entities has nothing missing", () => {
    const filter = { accountId: "account-1", categoryId: "category-1", tagIds: "tag-1,tag-2" };

    expect(missingFilterReferences(filter, known)).toEqual([]);
  });

  test("a deleted account, category or tag is reported", () => {
    const filter = { accountId: "gone-1", categoryId: "gone-2", tagIds: "tag-1,gone-3" };

    expect(missingFilterReferences(filter, known)).toEqual(["gone-1", "gone-2", "gone-3"]);
  });

  test("a filter that names no entity at all is never stale", () => {
    expect(missingFilterReferences({ search: "lidl", type: "expense" }, known)).toEqual([]);
  });
});
