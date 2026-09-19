import {
  type AccountResponse,
  InvestmentTransactionType,
  SecurityType,
} from "@/api/generated/model";

export const entryTypes = Object.values(InvestmentTransactionType);
export const securityTypes = Object.values(SecurityType);

export function isTrade(type: InvestmentTransactionType): boolean {
  return type === "buy" || type === "sell";
}

function usesQuantity(type: InvestmentTransactionType): boolean {
  return isTrade(type) || type === "split";
}

export function usesAmount(type: InvestmentTransactionType): boolean {
  return !usesQuantity(type);
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
