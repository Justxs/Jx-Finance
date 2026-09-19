import { describe, expect, test } from "vitest";
import type { AccountResponse, AccountType } from "@/api/generated/model";
import {
  defaultInvestmentAccount,
  entryTypes,
  isTrade,
  requiresSecurity,
  usesAmount,
} from "./investment-types";

function account(id: string, type: AccountType): AccountResponse {
  return {
    id,
    name: id,
    description: null,
    iban: null,
    type,
    startingBalance: "0.00",
    currentBalance: "0.00",
    createdAt: "2026-01-01T00:00:00Z",
    scope: "personal",
    householdId: null,
    currency: "eur",
    balances: [],
    reportingBalance: "0.00",
    holdingsValue: "0.00",
  };
}

describe("entry type rules", () => {
  test("only buys and sells are trades", () => {
    expect(entryTypes.filter(isTrade)).toEqual(["buy", "sell"]);
  });

  test("cash entries take an amount, trades and splits take a quantity", () => {
    expect(entryTypes.filter(usesAmount)).toEqual([
      "dividend",
      "withholdingTax",
      "interest",
      "fee",
    ]);
  });

  test("interest and fees stand without a security", () => {
    expect(entryTypes.filter((type) => !requiresSecurity(type))).toEqual(["interest", "fee"]);
  });
});

describe("defaultInvestmentAccount", () => {
  const accounts = [
    account("bank", "checking"),
    account("broker", "investment"),
    account("cash", "cash"),
  ];

  test("prefers the requested account", () => {
    expect(defaultInvestmentAccount(accounts, "cash")?.id).toBe("cash");
  });

  test("falls back to the first investment account", () => {
    expect(defaultInvestmentAccount(accounts)?.id).toBe("broker");
    expect(defaultInvestmentAccount(accounts, "missing")?.id).toBe("broker");
  });

  test("falls back to the first account, then nothing", () => {
    expect(defaultInvestmentAccount([account("bank", "checking")])?.id).toBe("bank");
    expect(defaultInvestmentAccount([])).toBeUndefined();
  });
});
