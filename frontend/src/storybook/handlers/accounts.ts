import {
  getArchivedAccountsMockHandler,
  getCreateAccountMockHandler,
  getDeleteAccountMockHandler,
  getAccountMockHandler,
  getAccountsMockHandler,
  getRestoreAccountMockHandler,
  getUpdateAccountMockHandler,
} from "@/api/generated/accounts/accounts.msw";
import type { AccountResponse } from "@/api/generated/model";
import { toCents } from "@/lib/money";
import { accounts, archivedAccounts, checkingAccount, withBalance } from "@/storybook/fixtures";
import { found, mergeScoped, query, readBody } from "./http";
import { CREATED_AT, NEW_ID } from "./ids";
import { applyDirection, byId, byIdFrom, compareText, includesText, updateFrom } from "./lists";

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

export const accountHandlers = [
  getArchivedAccountsMockHandler(archivedAccounts),
  getAccountsMockHandler(({ request }) => filterAccounts(query(request))),
  getCreateAccountMockHandler(async ({ request }) => {
    const created: AccountResponse = {
      ...checkingAccount,
      id: NEW_ID,
      description: null,
      iban: null,
      createdAt: CREATED_AT,
    };
    const merged = mergeScoped(created, await readBody(request));
    return withBalance(merged, merged.startingBalance);
  }),
  getAccountMockHandler(byIdFrom(accounts)),
  getUpdateAccountMockHandler(updateFrom(accounts, mergeScoped)),
  getDeleteAccountMockHandler(),
  getRestoreAccountMockHandler(({ params }) => {
    const archived = found(byId(archivedAccounts, params.id));
    return withBalance({ ...archived, createdAt: CREATED_AT }, archived.startingBalance);
  }),
];
