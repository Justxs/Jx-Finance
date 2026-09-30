import { expect, test } from "vitest";
import { amountRangeDraft, parseAmountRange } from "./transaction-filter-fields";

test("parses comma and dot decimals and leaves blank bounds open", () => {
  expect(parseAmountRange({ min: "49,5", max: "" })).toEqual({
    amountMin: 49.5,
    amountMax: undefined,
  });
  expect(parseAmountRange({ min: "", max: " 50.00 " })).toEqual({
    amountMin: undefined,
    amountMax: 50,
  });
});

test("drops text that is not a non-negative amount", () => {
  expect(parseAmountRange({ min: "-3", max: "abc" })).toEqual({
    amountMin: undefined,
    amountMax: undefined,
  });
  expect(parseAmountRange({ min: "1.005", max: "2" })).toEqual({
    amountMin: undefined,
    amountMax: 2,
  });
});

test("swaps bounds typed the wrong way round", () => {
  expect(parseAmountRange({ min: "60", max: "40" })).toEqual({ amountMin: 40, amountMax: 60 });
});

test("turns the search values back into text", () => {
  expect(amountRangeDraft({ amountMin: 49.5 })).toEqual({ min: "49.5", max: "" });
});
