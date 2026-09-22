import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { Currency, FlowType } from "@/api/generated/model";
import { browserStorage } from "@/lib/browser-storage";
import { DEFAULT_CURRENCY } from "@/lib/currency";

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

export type SavedFilter = z.output<typeof savedFilterSchema>;
export type SavedFilterValue = SavedFilter["filter"];
export type TransactionTemplate = z.output<typeof templateSchema>;
export type TransactionTemplateValues = TransactionTemplate["values"];

const storage = browserStorage();

const savedFilterOptions = localStorageCollectionOptions({
  id: "saved-filters",
  storageKey: SAVED_FILTERS_STORAGE_KEY,
  storage,
  schema: savedFilterSchema,
  getKey: (row) => row.id,
});

export const savedFiltersCollection = createCollection({
  ...savedFilterOptions,
  startSync: true,
  sync: {
    ...savedFilterOptions.sync,
    getSyncMetadata: () => ({ storageKey: SAVED_FILTERS_STORAGE_KEY }),
  },
});

const templateOptions = localStorageCollectionOptions({
  id: "transaction-templates",
  storageKey: TEMPLATES_STORAGE_KEY,
  storage,
  schema: templateSchema,
  getKey: (row) => row.id,
});

export const transactionTemplatesCollection = createCollection({
  ...templateOptions,
  startSync: true,
  sync: {
    ...templateOptions.sync,
    getSyncMetadata: () => ({ storageKey: TEMPLATES_STORAGE_KEY }),
  },
});

function byName<T extends { name: string }>(rows: readonly T[]): T[] {
  return rows.toSorted((left, right) => left.name.localeCompare(right.name));
}

let savedFiltersFrom = "";
let savedFilters: SavedFilter[] = [];

export function readSavedFilters(): SavedFilter[] {
  const rows = byName(savedFiltersCollection.toArray).map((row) => savedFilterSchema.parse(row));
  const serialized = JSON.stringify(rows);
  if (serialized !== savedFiltersFrom) {
    savedFiltersFrom = serialized;
    savedFilters = rows;
  }
  return savedFilters;
}

let templatesFrom = "";
let templates: TransactionTemplate[] = [];

export function readTransactionTemplates(): TransactionTemplate[] {
  const rows = byName(transactionTemplatesCollection.toArray).map((row) =>
    templateSchema.parse(row),
  );
  const serialized = JSON.stringify(rows);
  if (serialized !== templatesFrom) {
    templatesFrom = serialized;
    templates = rows;
  }
  return templates;
}

function onSavedFiltersChange(listener: () => void) {
  const subscription = savedFiltersCollection.subscribeChanges(listener);
  return () => subscription.unsubscribe();
}

function onTemplatesChange(listener: () => void) {
  const subscription = transactionTemplatesCollection.subscribeChanges(listener);
  return () => subscription.unsubscribe();
}

export function useSavedFilters(): SavedFilter[] {
  return useSyncExternalStore(onSavedFiltersChange, readSavedFilters);
}

export function useTransactionTemplates(): TransactionTemplate[] {
  return useSyncExternalStore(onTemplatesChange, readTransactionTemplates);
}

export function trimmedName(name: string) {
  return name.trim().slice(0, SAVED_NAME_MAX_LENGTH);
}

export function saveFilter(name: string, filter: SavedFilterValue): SavedFilter {
  const row = savedFilterSchema.parse({
    id: crypto.randomUUID(),
    name: trimmedName(name),
    filter,
  });
  savedFiltersCollection.insert(row);
  return row;
}

export function renameSavedFilter(id: string, name: string) {
  savedFiltersCollection.update(id, (draft) => {
    draft.name = trimmedName(name);
  });
}

export function deleteSavedFilter(id: string) {
  savedFiltersCollection.delete(id);
}

export function saveTransactionTemplate(
  name: string,
  values: TransactionTemplateValues,
): TransactionTemplate {
  const row = templateSchema.parse({
    id: crypto.randomUUID(),
    name: trimmedName(name),
    values,
  });
  transactionTemplatesCollection.insert(row);
  return row;
}

export function renameTransactionTemplate(id: string, name: string) {
  transactionTemplatesCollection.update(id, (draft) => {
    draft.name = trimmedName(name);
  });
}

export function deleteTransactionTemplate(id: string) {
  transactionTemplatesCollection.delete(id);
}

export function clearTransactionViews() {
  for (const row of savedFiltersCollection.toArray) {
    savedFiltersCollection.delete(row.id);
  }
  for (const row of transactionTemplatesCollection.toArray) {
    transactionTemplatesCollection.delete(row.id);
  }
}
