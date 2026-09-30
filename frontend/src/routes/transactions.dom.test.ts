import { expect, test } from "vitest";
import { transactionsSearchSchema } from "@/features/transactions/transaction-queries";

test("the ledger search keeps a payee and drops one that is not text", () => {
  expect(transactionsSearchSchema.parse({ payee: "maxima lt uab" }).payee).toBe("maxima lt uab");
  expect(transactionsSearchSchema.parse({ payee: 42 }).payee).toBeUndefined();
  expect(transactionsSearchSchema.parse({}).payee).toBeUndefined();
});

test("the ledger search keeps ISO dates and drops anything else", () => {
  const search = transactionsSearchSchema.parse({ dateFrom: "2026-09-01", dateTo: "yesterday" });

  expect(search.dateFrom).toBe("2026-09-01");
  expect(search.dateTo).toBeUndefined();
});

test("the ledger search keeps only a true unusual or uncategorized flag", () => {
  const search = transactionsSearchSchema.parse({ unusual: false, uncategorized: true });

  expect(search.unusual).toBeUndefined();
  expect(search.uncategorized).toBe(true);
});
