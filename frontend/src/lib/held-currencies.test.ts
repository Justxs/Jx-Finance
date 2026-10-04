import { expect, test } from "vitest";
import type { AccountResponse } from "@/api/generated/model";
import { account } from "@/storybook/fixtures/accounts";
import { heldCurrencies } from "./held-currencies";

const revolut: AccountResponse = {
  ...account({
    id: "a",
    name: "Revolut",
    description: null,
    iban: null,
    type: "checking",
    startingBalance: "0.00",
    balance: "10.00",
    createdAt: "2026-01-01T00:00:00Z",
  }),
  balances: [
    { currency: "eur", amount: "10.00" },
    { currency: "usd", amount: "4.20" },
  ],
  reportingBalance: "13.80",
};

test("lists the currencies an account holds in balance order", () => {
  expect(heldCurrencies(revolut)).toEqual(["eur", "usd"]);
});

test("no account holds nothing", () => {
  expect(heldCurrencies()).toEqual([]);
  expect(heldCurrencies({ ...revolut, balances: [] })).toEqual([]);
});
