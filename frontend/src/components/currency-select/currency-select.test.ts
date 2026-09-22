import { expect, test } from "vitest";
import { ALL_CURRENCIES } from "@/lib/currency";
import { orderCurrencies } from "./currency-select";

test("without a preference currencies sort alphabetically", () => {
  expect(orderCurrencies([])).toEqual(ALL_CURRENCIES.toSorted());
});

test("preferred currencies lead in the order given, the rest follow sorted", () => {
  const ordered = orderCurrencies(["usd", "eur"]);

  expect(ordered.slice(0, 2)).toEqual(["usd", "eur"]);
  expect(ordered.slice(2)).toEqual(ordered.slice(2).toSorted());
});

test("repeats collapse and nothing is lost", () => {
  const ordered = orderCurrencies(["usd", "usd", "eur"]);

  expect(ordered).toHaveLength(ALL_CURRENCIES.length);
  expect(new Set(ordered)).toEqual(new Set(ALL_CURRENCIES));
});
