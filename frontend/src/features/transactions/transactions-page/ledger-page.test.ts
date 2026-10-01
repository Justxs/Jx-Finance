import { QueryClient } from "@tanstack/react-query";
import { expect, test } from "vitest";
import type { CreateTransactionMutationVariables } from "@/api/generated";
import type {
  LedgerItemResponse,
  PagedResponseOfLedgerItemResponse,
  TransactionGroupSummary,
} from "@/api/generated/model";
import { isOptimistic } from "@/features/transactions/transaction-amount/transaction-row";
import { optimisticUpdate } from "@/lib/optimistic";
import {
  optimisticTransaction,
  withLedgerTransaction,
  withoutLedgerTransaction,
} from "./ledger-page";

const group: TransactionGroupSummary = {
  id: "group-1",
  name: "Trip to Riga",
  firstDate: "2026-07-03",
  lastDate: "2026-07-17",
  memberCount: 14,
  matchingCount: 14,
  netReportingAmount: "-612.40",
};

const groupItem: LedgerItemResponse = { kind: "group", transaction: null, group };

const ledgerKey = ["/api/transactions/ledger", { page: 1, pageSize: 20 }] as const;

const page: PagedResponseOfLedgerItemResponse = {
  items: [groupItem],
  page: 1,
  pageSize: 20,
  total: 31,
};

const created: CreateTransactionMutationVariables = {
  data: {
    accountId: "account-1",
    categoryId: null,
    type: "expense",
    amount: "12,50",
    date: "2026-09-18",
    description: "Coffee",
    tagIds: [],
    lines: null,
  },
};

test("an optimistic create puts the new row at the top of a cached ledger page as a transaction item", async () => {
  const client = new QueryClient();
  client.setQueryData(ledgerKey, page);
  const optimistic = optimisticUpdate({
    queryKey: ledgerKey,
    apply: (
      previous: PagedResponseOfLedgerItemResponse,
      variables: CreateTransactionMutationVariables,
    ) => withLedgerTransaction(previous, optimisticTransaction(variables, "eur")),
  });

  await optimistic.onMutate(created, { client });
  const cached = client.getQueryData<PagedResponseOfLedgerItemResponse>(ledgerKey);

  expect(cached?.total).toBe(32);
  expect(cached?.items).toHaveLength(2);
  const [first, second] = cached?.items ?? [];
  expect(first?.kind).toBe("transaction");
  expect(first?.group).toBeNull();
  expect(first?.transaction).toMatchObject({
    amount: "12.50",
    currency: "eur",
    description: "Coffee",
    groupId: null,
    enteredByMe: true,
  });
  expect(first?.transaction ? isOptimistic(first.transaction) : false).toBe(true);
  expect(second).toBe(groupItem);
});

test("an optimistic delete removes only the transaction item it names", () => {
  const transaction = optimisticTransaction(created, "eur");
  const withRow = withLedgerTransaction(page, transaction);

  const removed = withoutLedgerTransaction(withRow, { id: transaction.id });
  const untouched = withoutLedgerTransaction(withRow, { id: group.id });

  expect(removed.items).toEqual([groupItem]);
  expect(removed.total).toBe(31);
  expect(untouched).toEqual(withRow);
});
