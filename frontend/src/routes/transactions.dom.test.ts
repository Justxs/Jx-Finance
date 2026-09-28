import { expect, test } from "vitest";
import { transactionsSearchSchema } from "./transactions";

test("the ledger search keeps a payee and drops one that is not text", () => {
  expect(transactionsSearchSchema.parse({ payee: "maxima lt uab" }).payee).toBe("maxima lt uab");
  expect(transactionsSearchSchema.parse({ payee: 42 }).payee).toBeUndefined();
  expect(transactionsSearchSchema.parse({}).payee).toBeUndefined();
});
