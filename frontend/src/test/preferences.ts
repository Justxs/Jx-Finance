import { vi } from "vitest";
import { PREFERENCES_STORAGE_KEY, preferencesCollection } from "@/stores/preferences";

const STORAGE_KEY = PREFERENCES_STORAGE_KEY;
const PREFERENCES_ROW = "browser";
const ROW_KEY = `s:${PREFERENCES_ROW}`;

interface StoredRow {
  versionKey: string;
  data: Record<string, unknown>;
}

function storedRow(): StoredRow | undefined {
  const raw = localStorage.getItem(STORAGE_KEY);
  const rows: Record<string, StoredRow> = raw ? JSON.parse(raw) : {};
  return rows[ROW_KEY];
}

export function storedPreferences(): Record<string, unknown> {
  return storedRow()?.data ?? {};
}

export function seedPreferences(patch: Record<string, unknown>) {
  const data = { id: "browser", ...storedPreferences(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ [ROW_KEY]: { versionKey: "seed", data } }));
}

export function resetPreferences() {
  if (preferencesCollection.has(PREFERENCES_ROW)) {
    preferencesCollection.delete(PREFERENCES_ROW);
  }
}

export function blockStorage() {
  vi.spyOn(globalThis, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  });
}
