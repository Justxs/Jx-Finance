import { expect, test } from "vitest";
import type { AccountResponse } from "@/api/generated/model";
import { heldCurrencies } from "./held-currencies";

const account: AccountResponse = {
  id: "a",
  name: "Revolut",
  description: null,
  iban: null,
  type: "checking",
  startingBalance: "0.00",
  currentBalance: "10.00",
  createdAt: "2026-01-01T00:00:00Z",
  scope: "personal",
  householdId: null,
  currency: "eur",
  balances: [
    { currency: "eur", amount: "10.00" },
    { currency: "usd", amount: "4.20" },
  ],
  reportingBalance: "13.80",
  holdingsValue: "0.00",
};

test("lists the currencies an account holds in balance order", () => {
  expect(heldCurrencies(account)).toEqual(["eur", "usd"]);
});

test("no account holds nothing", () => {
  expect(heldCurrencies()).toEqual([]);
  expect(heldCurrencies({ ...account, balances: [] })).toEqual([]);
});
