import { expect, test } from "vitest";
import type { TransactionResponse } from "@/api/generated/model";
import { optimisticId } from "@/features/transactions/transaction-amount/transaction-row";
import { isSelectableTransaction } from "./use-transaction-columns";

function transaction(overrides: Partial<TransactionResponse>): TransactionResponse {
  return {
    id: "0198c0de",
    accountId: "account",
    categoryId: null,
    type: "expense",
    amount: "1.00",
    date: "2026-09-18",
    description: null,
    source: "manual",
    isSplit: false,
    createdAt: "2026-09-18T00:00:00Z",
    lines: null,
    currency: "eur",
    reportingAmount: "1.00",
    tagIds: [],
    attachmentCount: 0,
    ...overrides,
  };
}

test("saved single-category rows can be bulk selected", () => {
  expect(isSelectableTransaction(transaction({}))).toBe(true);
});

test("split rows and rows still saving cannot", () => {
  expect(isSelectableTransaction(transaction({ isSplit: true }))).toBe(false);
  expect(isSelectableTransaction(transaction({ id: optimisticId(1) }))).toBe(false);
});
