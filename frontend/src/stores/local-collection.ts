import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";
import type { z } from "zod";
import { browserStorage } from "@/lib/browser-storage";

const storage = browserStorage();

function discardUnreadable(storageKey: string) {
  const stored = storage.getItem(storageKey);
  if (stored === null) {
    return;
  }
  try {
    JSON.parse(stored);
  } catch {
    storage.removeItem(storageKey);
  }
}

export function localCollection<TSchema extends z.ZodType<{ id: string }>>(
  id: string,
  storageKey: string,
  schema: TSchema,
) {
  discardUnreadable(storageKey);
  const options = localStorageCollectionOptions({
    id,
    storageKey,
    storage,
    schema,
    getKey: (row) => row.id,
  });

  return createCollection({
    ...options,
    startSync: true,
    sync: { ...options.sync, getSyncMetadata: () => ({ storageKey }) },
  });
}
