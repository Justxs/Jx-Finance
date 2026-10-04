import { describe, expect, test } from "vitest";
import type { AccountResponse, AccountType } from "@/api/generated/model";
import { account } from "@/storybook/fixtures/accounts";
import {
  chargeSign,
  defaultInvestmentAccount,
  entryTypes,
  isTrade,
  requiresSecurity,
  usesAmount,
} from "./investment-types";

function accountOfType(id: string, type: AccountType): AccountResponse {
  return account({
    id,
    name: id,
    description: null,
    iban: null,
    type,
    startingBalance: "0.00",
    balance: "0.00",
    createdAt: "2026-01-01T00:00:00Z",
  });
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
    accountOfType("bank", "checking"),
    accountOfType("broker", "investment"),
    accountOfType("cash", "cash"),
  ];

  test("prefers the requested account", () => {
    expect(defaultInvestmentAccount(accounts, "cash")?.id).toBe("cash");
  });

  test("falls back to the first investment account", () => {
    expect(defaultInvestmentAccount(accounts)?.id).toBe("broker");
    expect(defaultInvestmentAccount(accounts, "missing")?.id).toBe("broker");
  });

  test("falls back to the first account, then nothing", () => {
    expect(defaultInvestmentAccount([accountOfType("bank", "checking")])?.id).toBe("bank");
    expect(defaultInvestmentAccount([])).toBeUndefined();
  });
});

describe("chargeSign", () => {
  test("a positive charge reads as money going out", () => {
    expect(chargeSign("1.25")).toBe("−");
  });

  test("no charge or a refund keeps its own sign", () => {
    expect(chargeSign("0")).toBe("auto");
    expect(chargeSign("-3")).toBe("auto");
  });
});
