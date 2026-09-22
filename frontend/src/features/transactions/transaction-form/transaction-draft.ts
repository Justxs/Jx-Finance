import type { Currency, FlowType, TransactionResponse } from "@/api/generated/model";
import { normalizeMoney } from "@/lib/validation";
import type { TransactionTemplateValues } from "@/stores/transaction-views";
import type { TransactionFormValues } from "./transaction-schema";

interface TransactionDraftLine {
  categoryId: string | null;
  amount: string;
  description: string | null;
}

export interface TransactionDraft {
  accountId?: string;
  categoryId?: string | null;
  type?: FlowType;
  amount?: string;
  currency?: Currency;
  date?: string;
  description?: string | null;
  isSplit?: boolean;
  tagIds?: string[];
  lines?: TransactionDraftLine[] | null;
}

export function draftFromTransaction(transaction: TransactionResponse): TransactionDraft {
  return {
    accountId: transaction.accountId,
    categoryId: transaction.categoryId,
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    date: transaction.date,
    description: transaction.description,
    isSplit: transaction.isSplit,
    tagIds: transaction.tagIds,
    lines:
      transaction.lines?.map((line) => ({
        categoryId: line.categoryId,
        amount: line.amount,
        description: line.description,
      })) ?? null,
  };
}

export function duplicateDraft(transaction: TransactionResponse): TransactionDraft {
  const { date: _date, ...rest } = draftFromTransaction(transaction);
  return rest;
}

export function templateValuesFromFormValues(
  values: TransactionFormValues,
): TransactionTemplateValues {
  return {
    accountId: values.accountId,
    categoryId: values.categoryId,
    type: values.type,
    amount: normalizeMoney(values.amount),
    currency: values.currency,
    description: values.description,
    tagIds: values.tagIds,
    lines: values.lines?.map((line) => ({ ...line, amount: normalizeMoney(line.amount) })) ?? null,
  };
}

export function draftFromTemplate(values: TransactionTemplateValues): TransactionDraft {
  return {
    accountId: values.accountId || undefined,
    categoryId: values.categoryId,
    type: values.type,
    amount: values.amount,
    currency: values.currency,
    description: values.description,
    isSplit: (values.lines?.length ?? 0) > 0,
    tagIds: values.tagIds,
    lines: values.lines,
  };
}
