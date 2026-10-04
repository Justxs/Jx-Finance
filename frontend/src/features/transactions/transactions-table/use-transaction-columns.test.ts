import { expect, test } from "vitest";
import type { TransactionResponse } from "@/api/generated/model";
import { optimisticId } from "@/lib/transaction-row";
import { transaction } from "@/storybook/fixtures/transactions";
import { isSelectableTransaction } from "./use-transaction-columns";

function row(overrides: Partial<TransactionResponse>): TransactionResponse {
  return transaction({
    id: "0198c0de",
    accountId: "account",
    amount: "1.00",
    reportingAmount: "1.00",
    date: "2026-09-18",
    createdAt: "2026-09-18T00:00:00Z",
    ...overrides,
  });
}

test("saved single-category rows can be bulk selected", () => {
  expect(isSelectableTransaction(row({}))).toBe(true);
});

test("split rows and rows still saving cannot", () => {
  expect(isSelectableTransaction(row({ isSplit: true }))).toBe(false);
  expect(isSelectableTransaction(row({ id: optimisticId(1) }))).toBe(false);
});
