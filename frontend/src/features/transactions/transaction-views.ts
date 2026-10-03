import {
  type Collection,
  type NonSingleResult,
  type UtilsRecord,
  useLiveQuery,
} from "@tanstack/react-db";
import { z } from "zod";
import { Currency, FlowType, SpreadDirection } from "@/api/generated/model";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { transactionFilterSchema } from "@/lib/transaction-filter";
import { localCollection } from "@/stores/local-collection";

export const SAVED_FILTERS_STORAGE_KEY = "jx-saved-filters";
export const TEMPLATES_STORAGE_KEY = "jx-transaction-templates";

export const SAVED_NAME_MAX_LENGTH = 60;

const savedName = z.string().max(SAVED_NAME_MAX_LENGTH);

const savedFilterSchema = z.object({
  id: z.string(),
  name: savedName,
  filter: transactionFilterSchema,
});

const templateLineSchema = z.object({
  categoryId: z.string().nullable().catch(null),
  amount: z.string().catch(""),
  description: z.string().nullable().catch(null),
});

const templateSchema = z.object({
  id: z.string(),
  name: savedName,
  values: z.object({
    accountId: z.string().catch(""),
    categoryId: z.string().nullable().catch(null),
    type: z.enum(FlowType).catch("expense"),
    amount: z.string().catch(""),
    currency: z.enum(Currency).catch(DEFAULT_CURRENCY),
    description: z.string().nullable().catch(null),
    place: z.string().nullable().catch(null).optional(),
    tagIds: z.array(z.string()).catch([]),
    lines: z.array(templateLineSchema).nullable().catch(null),
    spreadMonths: z.number().int().nullable().catch(null).optional(),
    spreadDirection: z.enum(SpreadDirection).nullable().catch(null).optional(),
  }),
});

export type TransactionTemplateValues = z.output<typeof templateSchema>["values"];

function trimmedName(name: string) {
  return name.trim().slice(0, SAVED_NAME_MAX_LENGTH);
}

function namedRows<TRow extends { id: string; name: string }, TUtils extends UtilsRecord>(
  collection: Collection<TRow, string, TUtils> & NonSingleResult,
  schema: z.ZodType<TRow>,
) {
  function byName(rows: readonly TRow[]): TRow[] {
    return rows
      .toSorted((left, right) => left.name.localeCompare(right.name))
      .map((row) => schema.parse(row));
  }

  function read() {
    return byName(collection.toArray);
  }

  function useRows() {
    const { data } = useLiveQuery(collection);
    return byName(data);
  }

  function save(name: string, fields: Omit<TRow, "id" | "name">): TRow {
    const row = schema.parse({ ...fields, id: crypto.randomUUID(), name: trimmedName(name) });
    collection.insert(row);
    return row;
  }

  function rename(rowId: string, name: string) {
    collection.update(rowId, (draft) => {
      Object.assign(draft, { name: trimmedName(name) });
    });
  }

  function remove(rowId: string) {
    collection.delete(rowId);
  }

  function clear() {
    for (const row of collection.toArray) {
      collection.delete(row.id);
    }
  }

  return { read, useRows, save, rename, remove, clear };
}

export const savedFilters = namedRows(
  localCollection("saved-filters", SAVED_FILTERS_STORAGE_KEY, savedFilterSchema),
  savedFilterSchema,
);

export const transactionTemplates = namedRows(
  localCollection("transaction-templates", TEMPLATES_STORAGE_KEY, templateSchema),
  templateSchema,
);

export function clearTransactionViews() {
  savedFilters.clear();
  transactionTemplates.clear();
}
