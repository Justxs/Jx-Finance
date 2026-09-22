type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const PROBE_KEY = "jx-storage-probe";

function usableLocalStorage(): Storage | null {
  try {
    const storage = globalThis.localStorage;
    storage.setItem(PROBE_KEY, "1");
    storage.removeItem(PROBE_KEY);
    return storage;
  } catch {
    return null;
  }
}

export function createMemoryStorage(): BrowserStorage {
  const items = new Map<string, string>();

  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

export function browserStorage(): BrowserStorage {
  return usableLocalStorage() ?? createMemoryStorage();
}
