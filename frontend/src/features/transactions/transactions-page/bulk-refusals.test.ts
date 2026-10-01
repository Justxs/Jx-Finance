import { expect, test } from "vitest";
import { refusalReasons } from "./bulk-refusals";

test("translates each code once and keeps the order the rows came in", () => {
  expect(
    refusalReasons([
      { transactionId: "a", code: "transaction.conversionFee", reason: "fee" },
      { transactionId: "b", code: "restore.referenceMissing", reason: "gone" },
      { transactionId: "c", code: "transaction.conversionFee", reason: "fee" },
    ]),
  ).toBe(
    "The fee of a currency conversion stays on the conversion's account. The account or category this entry needs is gone. Restore that first.",
  );
});

test("falls back to the server's reason for a code without a translation", () => {
  expect(
    refusalReasons([{ transactionId: "a", code: "unknown.code", reason: "Something else." }]),
  ).toBe("Something else.");
});

test("is empty when nothing was refused", () => {
  expect(refusalReasons([])).toBe("");
});
