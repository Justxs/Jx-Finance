import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";
import type { z } from "zod";
import { browserStorage } from "@/lib/browser-storage";

const storage = browserStorage();

export function localCollection<TSchema extends z.ZodType<{ id: string }>>(
  id: string,
  storageKey: string,
  schema: TSchema,
) {
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
