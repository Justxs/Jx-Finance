import { describe, expect, test } from "vitest";
import {
  accounts,
  categorySuggestionByRule,
  categorySuggestionLearned,
  checkingAccount,
  ids,
  noCategorySuggestion,
} from "@/storybook/fixtures";
import { chooseQuickAddCategory, parseQuickAdd, quickAddAccount } from "./quick-add";

describe("parseQuickAdd", () => {
  test.each([
    ["12.50 maxima", "12.50"],
    ["12,50 maxima", "12.50"],
    ["maxima 12.50", "12.50"],
    ["maxima 12,5", "12.5"],
    ["  7   maxima  ", "7"],
    ["007 maxima", "7"],
  ])("%s reads the amount %s", (query, amount) => {
    expect(parseQuickAdd(query)).toEqual({ amount, payee: "Maxima" });
  });

  test.each([
    ["1,234.50 maxima", "1234.50"],
    ["1.234,50 maxima", "1234.50"],
    ["1 234,50 maxima", "1234.50"],
    ["maxima 1 234,50", "1234.50"],
    ["1,234 maxima", "1234"],
    ["12.345.678 maxima", "12345678"],
  ])("thousands separators in %s give %s", (query, amount) => {
    expect(parseQuickAdd(query)?.amount).toBe(amount);
  });

  test("a payee of several words keeps them, and the amount may be at either end", () => {
    expect(parseQuickAdd("4.80 caffeine kava išsinešti")).toEqual({
      amount: "4.80",
      payee: "Caffeine kava išsinešti",
    });
    expect(parseQuickAdd("Gym 24 19.99")).toEqual({ amount: "19.99", payee: "Gym 24" });
  });

  test("Lithuanian diacritics in the payee are kept and the first letter is capitalized", () => {
    expect(parseQuickAdd("ąžuolynas 3,20")).toEqual({ amount: "3.20", payee: "Ąžuolynas" });
    expect(parseQuickAdd("9,99 eurovaistinė")).toEqual({ amount: "9.99", payee: "Eurovaistinė" });
    expect(parseQuickAdd("5 šešupės kepyklėlė")?.payee).toBe("Šešupės kepyklėlė");
    expect(parseQuickAdd("2 IKI")?.payee).toBe("IKI");
  });

  test.each(["-12.50 maxima", "maxima -12.50", "0 maxima", "0,00 maxima", "maxima 0.0"])(
    "a negative or zero amount in %s is refused",
    (query) => {
      expect(parseQuickAdd(query)).toBeNull();
    },
  );

  test.each(["", "maxima", "12.50", "12.50 13", "1,23,4 maxima", "1.234.50 maxima", "budgets"])(
    "%s is not a quick add",
    (query) => {
      expect(parseQuickAdd(query)).toBeNull();
    },
  );
});

describe("quickAddAccount", () => {
  const { cash, savings } = ids.accounts;

  test("the last used account wins, then the installation default, then the first account", () => {
    expect(quickAddAccount(accounts, cash, savings)?.id).toBe(cash);
    expect(quickAddAccount(accounts, "gone", savings)?.id).toBe(savings);
    expect(quickAddAccount(accounts, undefined, null)).toBe(checkingAccount);
  });

  test("no account means nothing can be added", () => {
    expect(quickAddAccount([], checkingAccount.id, null)).toBeUndefined();
  });
});

describe("chooseQuickAddCategory", () => {
  const recalled = ids.categories.cafes;

  test("a rule beats the recall, which beats a learned guess", () => {
    expect(chooseQuickAddCategory(categorySuggestionByRule, recalled)).toBe(
      categorySuggestionByRule.categoryId,
    );
    expect(chooseQuickAddCategory(categorySuggestionLearned, recalled)).toBe(recalled);
    expect(chooseQuickAddCategory(categorySuggestionLearned, "")).toBe(
      categorySuggestionLearned.categoryId,
    );
  });

  test("with nothing known the category stays empty", () => {
    expect(chooseQuickAddCategory(noCategorySuggestion, "")).toBeNull();
    expect(chooseQuickAddCategory(null, "")).toBeNull();
    expect(chooseQuickAddCategory(null, recalled)).toBe(recalled);
  });
});
