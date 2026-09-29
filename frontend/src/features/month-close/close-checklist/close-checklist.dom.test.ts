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
  };
}

test("accounts that differ or are behind need attention but are not open items", () => {
  const checklist = {
    uncategorized: 2,
    unusual: 0,
    unconfirmedRecurring: null,
    accounts: [account("reconciled"), account("differs"), account("imported"), account("behind")],
  };

  expect(attentionCount(checklist)).toBe(3);
  expect(openItemCount(checklist)).toBe(2);
});
