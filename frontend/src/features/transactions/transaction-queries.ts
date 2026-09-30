import { z } from "zod";
import { FlowType, TransactionSortField } from "@/api/generated/model";
import { optionalParam, sortParams } from "@/lib/search-schema";

export const transactionFilterSchema = z.object({
  search: optionalParam(z.string()),
  payee: optionalParam(z.string()),
  accountId: optionalParam(z.uuid()),
  categoryId: optionalParam(z.uuid()),
  tagIds: optionalParam(
    z.string().refine((value) => value.split(",").every((id) => z.uuid().safeParse(id).success)),
  ),
  type: optionalParam(z.enum(FlowType)),
  dateFrom: optionalParam(z.iso.date()),
  dateTo: optionalParam(z.iso.date()),
  amountMin: optionalParam(z.number().nonnegative()),
  amountMax: optionalParam(z.number().nonnegative()),
  unusual: optionalParam(z.literal(true)),
  uncategorized: optionalParam(z.literal(true)),
  spreadOverlap: optionalParam(z.literal(true)),
});

export const transactionsSearchSchema = transactionFilterSchema.extend({
  page: z.coerce.number().int().min(1).optional().default(1).catch(1),
  ...sortParams(TransactionSortField),
  new: optionalParam(z.boolean()),
});

export type TransactionFilter = z.infer<typeof transactionFilterSchema>;

type TransactionsView = Omit<z.infer<typeof transactionsSearchSchema>, "new">;

export function transactionFilterParams(view: TransactionFilter): TransactionFilter {
  return transactionFilterSchema.parse(view);
}

export function transactionView(search: TransactionsView): TransactionsView {
  return {
    ...transactionFilterParams(search),
    page: search.page,
    sort: search.sort,
    direction: search.direction,
  };
}

export function transactionListParams(view: TransactionsView, pageSize: number) {
  return { ...transactionView(view), pageSize };
}

export function isEmptyFilter(filter: TransactionFilter) {
  return Object.values(filter).every((value) => value === undefined || value === "");
}

interface KnownEntities {
  accountIds: ReadonlySet<string>;
  categoryIds: ReadonlySet<string>;
  tagIds: ReadonlySet<string>;
}

export function missingFilterReferences(filter: TransactionFilter, known: KnownEntities): string[] {
  const missing: string[] = [];
  if (filter.accountId && !known.accountIds.has(filter.accountId)) {
    missing.push(filter.accountId);
  }
  if (filter.categoryId && !known.categoryIds.has(filter.categoryId)) {
    missing.push(filter.categoryId);
  }
  for (const tagId of parseTagIds(filter.tagIds)) {
    if (!known.tagIds.has(tagId)) {
      missing.push(tagId);
    }
  }
  return missing;
}

export function parseTagIds(value: string | undefined): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export function formatTagIds(tagIds: readonly string[]): string | undefined {
  return tagIds.length > 0 ? tagIds.join(",") : undefined;
}
