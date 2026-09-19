import {
  getCreateAccountMockHandler,
  getDeleteAccountMockHandler,
  getAccountMockHandler,
  getAccountsMockHandler,
  getUpdateAccountMockHandler,
} from "@/api/generated/accounts/accounts.msw";
import type { AccountResponse } from "@/api/generated/model";
import { accounts, checkingAccount, toCents } from "@/storybook/fixtures";
import { found, readBody } from "./http";
import type { Body } from "./http";
import { CREATED_AT, NEW_ID } from "./ids";
import { applyDirection, byId, compareText, includesText } from "./lists";

function filterAccounts(params: URLSearchParams): AccountResponse[] {
  const search = params.get("search");
  const iban = params.get("iban");
  const type = params.get("type");
  const sort = params.get("sort");
  const filtered = accounts.filter(
    (item) =>
      (!search || includesText(item.name, search) || includesText(item.description, search)) &&
      (!iban || includesText(item.iban, iban)) &&
      (!type || item.type === type),
  );
  if (!sort) {
    return filtered;
  }
  const sorted = filtered.toSorted((a, b) => {
    switch (sort) {
      case "name":
        return compareText(a.name, b.name);
      case "iban":
        return compareText(a.iban, b.iban);
      case "type":
        return compareText(a.type, b.type);
      case "startingBalance":
        return toCents(a.startingBalance) - toCents(b.startingBalance);
      case "currentBalance":
        return toCents(a.currentBalance) - toCents(b.currentBalance);
      default:
        return compareText(a.createdAt, b.createdAt);
    }
  });
  return applyDirection(sorted, params, "asc");
}

function mergeAccount(base: AccountResponse, body: Body): AccountResponse {
  const merged: AccountResponse = { ...base, ...body };
  return { ...merged, scope: merged.householdId ? "shared" : "personal" };
}

export const accountHandlers = [
  getAccountsMockHandler(({ request }) => filterAccounts(new URL(request.url).searchParams)),
  getCreateAccountMockHandler(async ({ request }) => {
    const created: AccountResponse = {
      ...checkingAccount,
      id: NEW_ID,
      description: null,
      iban: null,
      createdAt: CREATED_AT,
    };
    const merged = mergeAccount(created, await readBody(request));
    return {
      ...merged,
      currentBalance: merged.startingBalance,
      reportingBalance: merged.startingBalance,
      holdingsValue: "0.00",
      balances: [{ currency: merged.currency, amount: merged.startingBalance }],
    };
  }),
  getAccountMockHandler(({ params }) => found(byId(accounts, params.id))),
  getUpdateAccountMockHandler(async ({ params, request }) =>
    mergeAccount(found(byId(accounts, params.id)), await readBody(request)),
  ),
  getDeleteAccountMockHandler(),
];
