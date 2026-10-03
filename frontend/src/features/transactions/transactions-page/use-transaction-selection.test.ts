import { expect, test } from "vitest";
import { selectionRange } from "./use-transaction-selection";

const order = ["a", "b", "c", "d", "e"];

test("a plain tick changes only its own row", () => {
  expect(selectionRange(order, "b", "d", false)).toEqual(["d"]);
});

test("a shift tick reaches back or forward to the last ticked row", () => {
  expect(selectionRange(order, "b", "d", true)).toEqual(["b", "c", "d"]);
  expect(selectionRange(order, "e", "c", true)).toEqual(["c", "d", "e"]);
});

test("a shift tick without an anchor on the page changes only its own row", () => {
  expect(selectionRange(order, null, "c", true)).toEqual(["c"]);
  expect(selectionRange(order, "z", "c", true)).toEqual(["c"]);
});
