import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";
import * as api from "@/api/generated";
import {
  hasInvalidationRule,
  invalidateAfterMutation,
  mutationsWithoutInvalidation,
} from "./invalidation";

type MutationKeyGetter = () => readonly [string];

const accountsKey = ["/api/accounts"];
const accountKey = ["/api/accounts/abc"];
const goalsKey = ["/api/goals"];

function isMutationKeyGetter(entry: [string, unknown]): entry is [string, MutationKeyGetter] {
  return /^get\w+MutationKey$/.test(entry[0]) && typeof entry[1] === "function";
}

function mutationKeyGetters() {
  const exportsByName: Record<string, unknown> = api;
  return Object.entries(exportsByName).filter(isMutationKeyGetter);
}

function seededClient() {
  const client = new QueryClient();
  client.setQueryData(accountsKey, []);
  client.setQueryData(accountKey, {});
  client.setQueryData(goalsKey, []);
  return client;
}

function isInvalidated(client: QueryClient, queryKey: readonly unknown[]) {
  return client.getQueryState(queryKey)?.isInvalidated;
}

describe("invalidation rules", () => {
  test("finds the generated mutation keys", () => {
    expect(mutationKeyGetters().length).toBeGreaterThan(0);
  });

  test.each(mutationKeyGetters())("%s is classified", (_name, getKey) => {
    const exempt = mutationsWithoutInvalidation.some((getExempt) => getExempt()[0] === getKey()[0]);

    expect(hasInvalidationRule(getKey()) || exempt).toBe(true);
  });

  test("no mutation is both exempt and covered by a rule", () => {
    const both = mutationsWithoutInvalidation.filter((getKey) => hasInvalidationRule(getKey()));

    expect(both).toEqual([]);
  });
});

describe("invalidateAfterMutation", () => {
  test("invalidates every query under the mapped roots and nothing else", async () => {
    const client = seededClient();

    await invalidateAfterMutation(client, ["createAccount"]);

    expect(isInvalidated(client, accountsKey)).toBe(true);
    expect(isInvalidated(client, accountKey)).toBe(true);
    expect(isInvalidated(client, goalsKey)).toBe(false);
  });

  const spending = [
    api.getBudgetsQueryKey,
    api.getReportSummaryQueryKey,
    api.getCategoryBreakdownQueryKey,
    api.getMonthlyTrendQueryKey,
  ];
  const balances = [
    api.getAccountsQueryKey,
    api.getNetWorthQueryKey,
    api.getDashboardSummaryQueryKey,
  ];

  test.each([
    ["createConversion", api.getCreateConversionMutationKey, [...spending, ...balances]],
    ["deleteConversion", api.getDeleteConversionMutationKey, [...spending, ...balances]],
    [
      "importBrokerReport",
      api.getImportBrokerReportMutationKey,
      [...spending, ...balances, api.getPortfolioQueryKey, api.getTransactionsQueryKey],
    ],
    [
      "syncBrokerConnection",
      api.getSyncBrokerConnectionMutationKey,
      [...spending, ...balances, api.getPortfolioQueryKey, api.getTransactionsQueryKey],
    ],
    [
      "removeMember",
      api.getRemoveMemberMutationKey,
      [
        api.getHouseholdsQueryKey,
        api.getAccountsQueryKey,
        api.getCategoriesQueryKey,
        api.getTransactionsQueryKey,
      ],
    ],
    [
      "deleteHousehold",
      api.getDeleteHouseholdMutationKey,
      [
        api.getHouseholdsQueryKey,
        api.getAccountsQueryKey,
        api.getCategoriesQueryKey,
        api.getTransactionsQueryKey,
      ],
    ],
    ["syncExchangeRates", api.getSyncExchangeRatesMutationKey, balances],
    ["reactivateUser", api.getReactivateUserMutationKey, [api.getUsersQueryKey]],
    ["resetUserPassword", api.getResetUserPasswordMutationKey, [api.getUsersQueryKey]],
    [
      "setSecurityPrice",
      api.getSetSecurityPriceMutationKey,
      [...balances, api.getPortfolioQueryKey, api.getSecuritiesQueryKey],
    ],
  ])("%s refreshes the derived figures", async (_name, getMutationKey, roots) => {
    const client = seededClient();
    const queryKeys = roots.map((getRoot) => [getRoot()[0], { page: 1 }]);
    for (const queryKey of queryKeys) {
      client.setQueryData(queryKey, {});
    }

    await invalidateAfterMutation(client, getMutationKey());

    expect(queryKeys.filter((queryKey) => !isInvalidated(client, queryKey))).toEqual([]);
    expect(isInvalidated(client, goalsKey)).toBe(false);
  });

  test.each([
    ["deleteTransaction", api.getDeleteTransactionMutationKey],
    ["deleteTransfer", api.getDeleteTransferMutationKey],
    ["deleteConversion", api.getDeleteConversionMutationKey],
    ["deleteBudget", api.getDeleteBudgetMutationKey],
    ["deleteGoal", api.getDeleteGoalMutationKey],
    ["deleteAsset", api.getDeleteAssetMutationKey],
    ["deleteDebt", api.getDeleteDebtMutationKey],
    ["deleteRecurringBill", api.getDeleteRecurringBillMutationKey],
  ])("%s refreshes the trash", async (_name, getMutationKey) => {
    const client = seededClient();
    const trashKey = [api.getTrashQueryKey()[0], { page: 1 }];
    client.setQueryData(trashKey, {});

    await invalidateAfterMutation(client, getMutationKey());

    expect(isInvalidated(client, trashKey)).toBe(true);
  });

  test.each([
    ["createBudget", api.getCreateBudgetMutationKey],
    ["updateBudget", api.getUpdateBudgetMutationKey],
    ["deleteBudget", api.getDeleteBudgetMutationKey],
    ["createTransaction", api.getCreateTransactionMutationKey],
    ["importConfirm", api.getImportConfirmMutationKey],
  ])("%s refreshes the budget suggestions", async (_name, getMutationKey) => {
    const client = seededClient();
    const suggestionsKey = api.getBudgetSuggestionsQueryKey({ period: "monthly" });
    client.setQueryData(suggestionsKey, {});

    await invalidateAfterMutation(client, getMutationKey());

    expect(isInvalidated(client, suggestionsKey)).toBe(true);
  });

  test.each([
    ["createRecurringBill", api.getCreateRecurringBillMutationKey],
    ["updateRecurringBill", api.getUpdateRecurringBillMutationKey],
    ["deleteRecurringBill", api.getDeleteRecurringBillMutationKey],
    ["confirmRecurringBill", api.getConfirmRecurringBillMutationKey],
    ["createTransfer", api.getCreateTransferMutationKey],
  ])("%s refreshes the cash-flow forecast", async (_name, getMutationKey) => {
    const client = seededClient();
    const forecastKey = api.getCashFlowForecastQueryKey({ days: 90 });
    client.setQueryData(forecastKey, {});

    await invalidateAfterMutation(client, getMutationKey());

    expect(isInvalidated(client, forecastKey)).toBe(true);
  });

  test.each([
    ["confirmRecurringBill", api.getConfirmRecurringBillMutationKey],
    ["updateRecurringBill", api.getUpdateRecurringBillMutationKey],
    ["createTransaction", api.getCreateTransactionMutationKey],
    ["deleteTransaction", api.getDeleteTransactionMutationKey],
    ["createTransfer", api.getCreateTransferMutationKey],
    ["createConversion", api.getCreateConversionMutationKey],
    ["importConfirm", api.getImportConfirmMutationKey],
    ["syncBrokerConnection", api.getSyncBrokerConnectionMutationKey],
  ])("%s refreshes the bills calendar", async (_name, getMutationKey) => {
    const client = seededClient();
    const calendarKey = api.getBillsCalendarQueryKey({ month: "2026-09" });
    client.setQueryData(calendarKey, {});

    await invalidateAfterMutation(client, getMutationKey());

    expect(isInvalidated(client, calendarKey)).toBe(true);
  });

  test("invalidates everything after a restore, because any kind can come back", async () => {
    const client = seededClient();

    await invalidateAfterMutation(client, ["restoreDeleted"]);

    expect(isInvalidated(client, accountsKey)).toBe(true);
    expect(isInvalidated(client, goalsKey)).toBe(true);
  });

  test("invalidates everything after settings change", async () => {
    const client = seededClient();

    await invalidateAfterMutation(client, ["updateSettings"]);

    expect(isInvalidated(client, accountsKey)).toBe(true);
    expect(isInvalidated(client, accountKey)).toBe(true);
    expect(isInvalidated(client, goalsKey)).toBe(true);
  });

  test.each([[["somethingUnknown"]], [undefined]])(
    "invalidates nothing for mutation key %j",
    async (mutationKey) => {
      const client = seededClient();

      await invalidateAfterMutation(client, mutationKey);

      expect(isInvalidated(client, accountsKey)).toBe(false);
      expect(isInvalidated(client, accountKey)).toBe(false);
      expect(isInvalidated(client, goalsKey)).toBe(false);
    },
  );
});
