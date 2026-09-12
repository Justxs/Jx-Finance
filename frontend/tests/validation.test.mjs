import test from "node:test";
import assert from "node:assert/strict";
import { isMoney, isPositiveMoney, normalizeMoney } from "../src/lib/validation.ts";

test("dot and comma decimal entry normalize to an exact wire string", () => {
  for (const [input, expected] of [
    ["12,50", "12.50"],
    [" 12.50 ", "12.50"],
    ["-0,10", "-0.10"],
  ]) {
    assert.equal(isMoney(input), true);
    assert.equal(normalizeMoney(input), expected);
  }
});
test("money validation rejects ambiguous separators and excess precision", () => {
  for (const value of ["1,234.56", "1.234,56", "12,345", "1e3", "NaN", "Infinity", "", "--2"])
    assert.equal(isMoney(value), false, value);
});
test("expense inputs must be positive", () => {
  assert.equal(isPositiveMoney("0,01"), true);
  assert.equal(isPositiveMoney("0,00"), false);
  assert.equal(isPositiveMoney("-0,01"), false);
});
