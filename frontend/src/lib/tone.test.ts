import { expect, test } from "vitest";
import { EXPENSE_TONE, INCOME_TONE, gainTone } from "./tone";

test("gains read as income, losses as expense and flat stays neutral", () => {
  expect(gainTone(0.01)).toBe(INCOME_TONE);
  expect(gainTone(-0.01)).toBe(EXPENSE_TONE);
  expect(gainTone(0)).toBeUndefined();
});
