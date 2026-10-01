import { expect, test } from "vitest";
import type { MonthAccountCoverage, MonthAccountState } from "@/api/generated/model";
import { attentionCount, openItemCount } from "./close-checklist";

function account(state: MonthAccountState): MonthAccountCoverage {
  return {
    accountId: state,
    accountName: state,
    state,
    date: "2026-08-31",
    difference: null,
    currency: "eur",
    otherCurrencies: [],
  };
}

test("possible duplicates are open items, while accounts that differ or are behind only need attention", () => {
  const checklist = {
    uncategorized: 2,
    unusual: 0,
    duplicates: 2,
    unconfirmedRecurring: null,
    accounts: [account("reconciled"), account("differs"), account("imported"), account("behind")],
  };

  expect(attentionCount(checklist)).toBe(4);
  expect(openItemCount(checklist)).toBe(4);
});
