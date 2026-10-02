import {
  type AccountResponse,
  InvestmentTransactionType,
  SecurityType,
} from "@/api/generated/model";
import type { MoneySign } from "@/hooks/use-formatters";
import { normalizeMoney } from "@/lib/validation";

export const entryTypes = Object.values(InvestmentTransactionType);
export const securityTypes = Object.values(SecurityType);

export function isTrade(type: InvestmentTransactionType): boolean {
  return type === "buy" || type === "sell";
}

const cashTypes = new Set<InvestmentTransactionType>([
  "dividend",
  "withholdingTax",
  "interest",
  "fee",
]);

export function movesHolding(type: InvestmentTransactionType): boolean {
  return type === "symbolChange" || type === "merger" || type === "spinOff";
}

export function requiresRelatedSecurity(type: InvestmentTransactionType): boolean {
  return type === "symbolChange" || type === "spinOff";
}

export function receivesShares(type: InvestmentTransactionType): boolean {
  return type === "merger" || type === "spinOff";
}

export function movesNoCash(type: InvestmentTransactionType): boolean {
  return type === "split" || type === "symbolChange" || type === "spinOff";
}

export function takesCostShare(
  type: InvestmentTransactionType,
  relatedSecurityId: string | null,
  cash: string,
): boolean {
  if (type === "spinOff") {
    return true;
  }

  return type === "merger" && Boolean(relatedSecurityId) && Number(normalizeMoney(cash)) > 0;
}

export function usesAmount(type: InvestmentTransactionType): boolean {
  return cashTypes.has(type);
}

export function usesQuantity(type: InvestmentTransactionType): boolean {
  return !usesAmount(type) && type !== "spinOff";
}

export function requiresSecurity(type: InvestmentTransactionType): boolean {
  return type !== "interest" && type !== "fee";
}

export function defaultInvestmentAccount(
  accounts: readonly AccountResponse[],
  accountId?: string,
): AccountResponse | undefined {
  return (
    accounts.find((account) => account.id === accountId) ??
    accounts.find((account) => account.type === "investment") ??
    accounts[0]
  );
}

export function chargeSign(value: string): MoneySign {
  return Number(value) > 0 ? "−" : "auto";
}
