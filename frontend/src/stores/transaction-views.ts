import { type Collection, type NonSingleResult, useLiveQuery } from "@tanstack/react-db";
import { z } from "zod";
import { Currency, FlowType } from "@/api/generated/model";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { localCollection } from "./local-collection";

export const SAVED_FILTERS_STORAGE_KEY = "jx-saved-filters";
export const TEMPLATES_STORAGE_KEY = "jx-transaction-templates";

export const SAVED_NAME_MAX_LENGTH = 60;

const flowType = z.enum(FlowType);

const savedFilterSchema = z.object({
  id: z.string(),
  name: z.string().max(SAVED_NAME_MAX_LENGTH),
  filter: z.object({
    search: z.string().optional().catch(undefined),
    accountId: z.string().optional().catch(undefined),
    categoryId: z.string().optional().catch(undefined),
    tagIds: z.string().optional().catch(undefined),
    type: flowType.optional().catch(undefined),
    dateFrom: z.string().optional().catch(undefined),
    dateTo: z.string().optional().catch(undefined),
  }),
});

const templateLineSchema = z.object({
  categoryId: z.string().nullable().catch(null),
  amount: z.string().catch(""),
  description: z.string().nullable().catch(null),
});

const templateSchema = z.object({
  id: z.string(),
  name: z.string().max(SAVED_NAME_MAX_LENGTH),
  values: z.object({
    accountId: z.string().catch(""),
    categoryId: z.string().nullable().catch(null),
    type: flowType.catch("expense"),
    amount: z.string().catch(""),
    currency: z.enum(Currency).catch(DEFAULT_CURRENCY),
    description: z.string().nullable().catch(null),
    tagIds: z.array(z.string()).catch([]),
    lines: z.array(templateLineSchema).nullable().catch(null),
  }),
});

type SavedFilter = z.output<typeof savedFilterSchema>;
type SavedFilterValue = SavedFilter["filter"];
type TransactionTemplate = z.output<typeof templateSchema>;
export type TransactionTemplateValues = TransactionTemplate["values"];

interface NamedRow {
  id: string;
  name: string;
}

function trimmedName(name: string) {
  return name.trim().slice(0, SAVED_NAME_MAX_LENGTH);
}

function namedRows<TRow extends NamedRow>(
  collection: Collection<TRow, string> & NonSingleResult,
  schema: z.ZodType<TRow>,
) {
  function parsedByName(rows: readonly TRow[]): TRow[] {
    return rows
      .toSorted((left, right) => left.name.localeCompare(right.name))
      .map((row) => schema.parse(row));
  }

  return {
    collection,
    parsedByName,
    read() {
      return parsedByName(collection.toArray);
    },
    save(name: string, fields: Omit<TRow, keyof NamedRow>): TRow {
      const row = schema.parse({ ...fields, id: crypto.randomUUID(), name: trimmedName(name) });
      collection.insert(row);
      return row;
    },
    rename(id: string, name: string) {
      collection.update(id, (draft) => {
        Object.assign(draft, { name: trimmedName(name) });
      });
    },
    remove(id: string) {
      collection.delete(id);
    },
    clear() {
      for (const row of collection.toArray) {
        collection.delete(row.id);
      }
    },
  };
}

function useNamedRows<TRow extends NamedRow>({
  collection,
  parsedByName,
}: ReturnType<typeof namedRows<TRow>>): TRow[] {
  const { data } = useLiveQuery(collection);
  return parsedByName(data);
}

const savedFilters = namedRows(
  localCollection("saved-filters", SAVED_FILTERS_STORAGE_KEY, savedFilterSchema),
  savedFilterSchema,
);

const templates = namedRows(
  localCollection("transaction-templates", TEMPLATES_STORAGE_KEY, templateSchema),
  templateSchema,
);

export function readSavedFilters(): SavedFilter[] {
  return savedFilters.read();
}

export function readTransactionTemplates(): TransactionTemplate[] {
  return templates.read();
}

export function useSavedFilters(): SavedFilter[] {
  return useNamedRows(savedFilters);
}

export function useTransactionTemplates(): TransactionTemplate[] {
  return useNamedRows(templates);
}

export function saveFilter(name: string, filter: SavedFilterValue): SavedFilter {
  return savedFilters.save(name, { filter });
}

export function renameSavedFilter(id: string, name: string) {
  savedFilters.rename(id, name);
}

export function deleteSavedFilter(id: string) {
  savedFilters.remove(id);
}

export function saveTransactionTemplate(
  name: string,
  values: TransactionTemplateValues,
): TransactionTemplate {
  return templates.save(name, { values });
}

export function renameTransactionTemplate(id: string, name: string) {
  templates.rename(id, name);
}

export function deleteTransactionTemplate(id: string) {
  templates.remove(id);
}

export function clearTransactionViews() {
  savedFilters.clear();
  templates.clear();
}
