import { expect, test } from "vitest";
import { gainTone } from "./gain-tone";

test("gains read as income, losses as expense and flat stays neutral", () => {
  expect(gainTone(0.01)).toBe("text-income");
  expect(gainTone(-0.01)).toBe("text-expense");
  expect(gainTone(0)).toBeUndefined();
});
