import { expect, test } from "vitest";
import { EXPENSE_TONE, INCOME_TONE, gainTone } from "./tone";

test("gains read as income, losses as expense and flat stays neutral", () => {
  expect(gainTone(0.01)).toBe(INCOME_TONE);
  expect(gainTone(-0.01)).toBe(EXPENSE_TONE);
  expect(gainTone(0)).toBeUndefined();
});

test("a fixed sign sets the tone whatever the sign of the value, and zero stays neutral", () => {
  expect(gainTone(-12, "+")).toBe(INCOME_TONE);
  expect(gainTone(12, "−")).toBe(EXPENSE_TONE);
  expect(gainTone(0, "+")).toBeUndefined();
  expect(gainTone(0, "−")).toBeUndefined();
});
