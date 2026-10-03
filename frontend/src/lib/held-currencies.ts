import type { AccountResponse, Currency } from "@/api/generated/model";

export function heldCurrencies(account?: AccountResponse): Currency[] {
  return account ? account.balances.map((balance) => balance.currency) : [];
}
