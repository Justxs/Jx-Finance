import type {
  Currency,
  FlowType,
  TransactionLineRequest,
  TransactionRefundOfResponse,
  TransactionResponse,
} from "@/api/generated/model";
import type { TransactionTemplateValues } from "@/features/transactions/transaction-views";
import { normalizeMoney } from "@/lib/validation";
import type { TransactionFormValues } from "./transaction-schema";

export interface TransactionDraft {
  accountId?: string;
  categoryId?: string | null;
  type?: FlowType;
  amount?: string;
  currency?: Currency;
  date?: string;
  description?: string | null;
  note?: string | null;
  isSplit?: boolean;
  tagIds?: string[];
  lines?: TransactionLineRequest[] | null;
  refundOf?: TransactionRefundOfResponse | null;
  spreadMonths?: number | null;
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
    note: transaction.note,
    isSplit: transaction.isSplit,
    tagIds: transaction.tagIds,
    lines:
      transaction.lines?.map((line) => ({
        categoryId: line.categoryId,
        amount: line.amount,
        description: line.description,
      })) ?? null,
    refundOf: transaction.refundOf ?? null,
    spreadMonths: transaction.spreadMonths,
  };
}

export function duplicateDraft(transaction: TransactionResponse): TransactionDraft {
  const { date: _date, ...rest } = draftFromTransaction(transaction);
  return rest;
}

export function refundDraft(purchase: TransactionResponse): TransactionDraft {
  return {
    accountId: purchase.accountId,
    categoryId: purchase.isSplit ? null : purchase.categoryId,
    type: "expense",
    amount: `-${purchase.amount}`,
    currency: purchase.currency,
    description: purchase.description,
    tagIds: purchase.tagIds,
    refundOf: { id: purchase.id, date: purchase.date, description: purchase.description },
  };
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
    spreadMonths: values.spreadMonths,
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
    spreadMonths: values.spreadMonths,
  };
}
