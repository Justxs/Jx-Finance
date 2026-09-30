import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import { getExportTaxSummaryUrl } from "@/api/generated";
import { freshModuleLoader } from "@/test/fresh-module";
import { seedPreferences } from "@/test/preferences";

const family = "33333333-0000-4000-8000-000000000001";
const garden = "33333333-0000-4000-8000-000000000002";

const load = await freshModuleLoader(async () => ({
  useExportUrl: (await import("./use-export-url")).useExportUrl,
  setActiveHousehold: (await import("@/stores/active-household-store")).setActiveHousehold,
}));

const csv = getExportTaxSummaryUrl({ year: 2026 });

function csvLink(useExportUrl: (url: string) => string) {
  return renderHook(() => useExportUrl(csv));
}

test("an export link carries no household while the scope is everything", async () => {
  const { useExportUrl } = await load();

  expect(csvLink(useExportUrl).result.current).toBe(csv);
});

test("an export link carries the active household", async () => {
  seedPreferences({ activeHouseholdId: family });
  const { useExportUrl } = await load();

  expect(csvLink(useExportUrl).result.current).toBe(`${csv}&activeHousehold=${family}`);
});

test("an export link follows the switcher and drops the household again", async () => {
  seedPreferences({ activeHouseholdId: family });
  const { useExportUrl, setActiveHousehold } = await load();
  const { result } = csvLink(useExportUrl);

  act(() => setActiveHousehold(garden));
  expect(result.current).toBe(`${csv}&activeHousehold=${garden}`);

  act(() => setActiveHousehold(undefined));
  expect(result.current).toBe(csv);
});

test("an export link without parameters starts its query at the household", async () => {
  seedPreferences({ activeHouseholdId: family });
  const { useExportUrl } = await load();

  expect(renderHook(() => useExportUrl(getExportTaxSummaryUrl())).result.current).toBe(
    `${getExportTaxSummaryUrl()}?activeHousehold=${family}`,
  );
});
