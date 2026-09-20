import { vi } from "vitest";

const STORAGE_KEY = "jx-preferences";
const ROW_KEY = "s:browser";

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

export function blockStorage() {
  vi.spyOn(globalThis, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  });
}
