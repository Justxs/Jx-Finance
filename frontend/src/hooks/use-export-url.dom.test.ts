import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { seedPreferences } from "@/test/preferences";

const family = "33333333-0000-4000-8000-000000000001";
const garden = "33333333-0000-4000-8000-000000000002";

async function load() {
  vi.resetModules();
  return {
    useExportUrl: (await import("./use-export-url")).useExportUrl,
    setActiveHousehold: (await import("@/stores/active-household-store")).setActiveHousehold,
  };
}

function csvLink(useExportUrl: (path: string, params: Record<string, string>) => string) {
  return renderHook(() => useExportUrl("/api/transactions/export", { dateFrom: "2026-01-01" }));
}

test("an export link carries no household while the scope is everything", async () => {
  const { useExportUrl } = await load();

  expect(csvLink(useExportUrl).result.current).toBe("/api/transactions/export?dateFrom=2026-01-01");
});

test("an export link carries the active household", async () => {
  seedPreferences({ activeHouseholdId: family });
  const { useExportUrl } = await load();

  expect(csvLink(useExportUrl).result.current).toBe(
    `/api/transactions/export?dateFrom=2026-01-01&activeHousehold=${family}`,
  );
});

test("an export link follows the switcher and drops the household again", async () => {
  seedPreferences({ activeHouseholdId: family });
  const { useExportUrl, setActiveHousehold } = await load();
  const { result } = csvLink(useExportUrl);

  act(() => setActiveHousehold(garden));
  expect(result.current).toBe(
    `/api/transactions/export?dateFrom=2026-01-01&activeHousehold=${garden}`,
  );

  act(() => setActiveHousehold(undefined));
  expect(result.current).toBe("/api/transactions/export?dateFrom=2026-01-01");
});
