import { vi } from "vitest";

export async function freshModuleLoader<TModule>(
  load: () => Promise<TModule>,
): Promise<() => Promise<TModule>> {
  await load();
  return async function fresh() {
    vi.resetModules();
    return load();
  };
}
