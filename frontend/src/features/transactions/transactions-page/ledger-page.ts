import type { CreateTransactionMutationVariables } from "@/api/generated";
import type {
  Currency,
  PagedResponseOfLedgerItemResponse,
  TransactionResponse,
} from "@/api/generated/model";
import { spreadFrom, spreadUntil } from "@/lib/spread-slices";
import { optimisticId } from "@/lib/transaction-row";
import { normalizeMoney } from "@/lib/validation";

export function optimisticTransaction(
  { data }: CreateTransactionMutationVariables,
  reportingCurrency: Currency,
): TransactionResponse {
  return {
    id: optimisticId(crypto.randomUUID()),
    accountId: data.accountId,
    categoryId: data.categoryId,
    type: data.type,
    amount: normalizeMoney(data.amount),
    currency: data.currency ?? reportingCurrency,
    reportingAmount: normalizeMoney(data.amount),
    date: data.date,
    description: data.description,
    source: "manual",
    isSplit: (data.lines?.length ?? 0) > 0,
    lines:
      data.lines?.map((line, index) => ({
        id: optimisticId(`line-${index}`),
        categoryId: line.categoryId,
        amount: normalizeMoney(line.amount),
        description: line.description,
      })) ?? null,
    tagIds: data.tagIds ?? [],
    createdAt: new Date().toISOString(),
    attachmentCount: 0,
    unusual: null,
    unusualDismissed: false,
    spreadMonths: data.spreadMonths,
    spreadDirection: data.spreadMonths ? (data.spreadDirection ?? "forward") : null,
    spreadFrom: data.spreadMonths
      ? spreadFrom(data.date, data.spreadMonths, data.spreadDirection ?? "forward")
      : null,
    spreadUntil: data.spreadMonths
      ? spreadUntil(data.date, data.spreadMonths, data.spreadDirection ?? "forward")
      : null,
    place: data.place,
    latitude: data.latitude,
    longitude: data.longitude,
    groupId: null,
    enteredByMe: true,
  };
}

export function withLedgerTransaction(
  page: PagedResponseOfLedgerItemResponse,
  transaction: TransactionResponse,
): PagedResponseOfLedgerItemResponse {
  return {
    ...page,
    items: [{ kind: "transaction", transaction, group: null }, ...page.items],
    total: page.total + 1,
  };
}

export function withoutLedgerTransaction(
  page: PagedResponseOfLedgerItemResponse,
  { id }: { id: string },
): PagedResponseOfLedgerItemResponse {
  const items = page.items.filter((item) => item.transaction?.id !== id);
  return { ...page, items, total: page.total - (page.items.length - items.length) };
}
