import type { AccountResponse, CategorySuggestionResponse } from "@/api/generated/model";
import type { TransactionDraft } from "@/features/transactions/transaction-form/transaction-draft";

export interface QuickAdd {
  amount: string;
  payee: string;
}

export interface QuickAddDraft extends TransactionDraft {
  accountId: string;
  amount: string;
  description: string;
}

const plainAmount = /^(?<whole>\d+)(?:[.,](?<fraction>\d{1,2}))?$/u;
const groupedAmount =
  /^(?<whole>\d{1,3}(?<group>[ .,])\d{3}(?:\k<group>\d{3})*)(?:(?!\k<group>)[.,](?<fraction>\d{1,2}))?$/u;

function amountOf(text: string): string | null {
  const groups = (plainAmount.exec(text) ?? groupedAmount.exec(text))?.groups;
  if (!groups) {
    return null;
  }
  const whole = (groups.whole ?? "").replaceAll(/\D/gu, "").replace(/^0+(?=\d)/u, "");
  const amount = groups.fraction === undefined ? whole : `${whole}.${groups.fraction}`;
  return Number(amount) > 0 ? amount : null;
}

function payeeOf(words: readonly string[]): string | null {
  const payee = words.join(" ");
  if (!/\p{Letter}/u.test(payee)) {
    return null;
  }
  return payee.charAt(0).toLocaleUpperCase() + payee.slice(1);
}

function split(words: readonly string[], at: number, amountFirst: boolean): QuickAdd | null {
  const amountWords = amountFirst ? words.slice(0, at) : words.slice(at);
  const payeeWords = amountFirst ? words.slice(at) : words.slice(0, at);
  const amount = amountOf(amountWords.join(" "));
  const payee = amount === null ? null : payeeOf(payeeWords);
  return amount !== null && payee !== null ? { amount, payee } : null;
}

export function parseQuickAdd(query: string): QuickAdd | null {
  const words = query.trim().split(/\s+/u);
  for (let at = words.length - 1; at >= 1; at -= 1) {
    const found = split(words, at, true);
    if (found) {
      return found;
    }
  }
  for (let at = 1; at < words.length; at += 1) {
    const found = split(words, at, false);
    if (found) {
      return found;
    }
  }
  return null;
}

export function quickAddAccount(
  accounts: readonly AccountResponse[],
  lastAccountId: string | undefined,
  defaultAccountId: string | null,
): AccountResponse | undefined {
  return (
    accounts.find((account) => account.id === lastAccountId) ??
    accounts.find((account) => account.id === defaultAccountId) ??
    accounts[0]
  );
}

export function chooseQuickAddCategory(
  suggestion: CategorySuggestionResponse | null,
  recalledId: string,
): string | null {
  if (suggestion?.source === "rule") {
    return suggestion.categoryId;
  }
  return recalledId || (suggestion?.categoryId ?? null);
}
