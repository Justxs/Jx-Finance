import { expect, test } from "vitest";
import { emptyLine, splitBalance } from "./line-form-value";

test("an empty line is blank apart from a unique id", () => {
  const first = emptyLine();
  const second = emptyLine();

  expect(first).toEqual({ id: first.id, categoryId: "", amount: "", description: "" });
  expect(first.id).not.toBe("");
  expect(first.id).not.toBe(second.id);
});

function line(amount: string) {
  return { ...emptyLine(), amount };
}

test("the split balance counts valid line amounts against the total", () => {
  expect(splitBalance("75", [line("52,10"), line(""), line("abc")])).toEqual({
    totalCents: 7500,
    assignedCents: 5210,
    remainingCents: 2290,
  });
});

test("an over-assigned split has a negative remainder", () => {
  expect(splitBalance("10.00", [line("7"), line("4.50")])?.remainingCents).toBe(-150);
});

test("there is no balance until the transaction amount is valid", () => {
  expect(splitBalance("", [line("5")])).toBeNull();
  expect(splitBalance("0", [line("5")])).toBeNull();
});
