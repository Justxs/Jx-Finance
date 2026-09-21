import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { seedPreferences, storedPreferences } from "@/test/preferences";

const family = "22222222-0000-4000-8000-000000000001";
const garden = "22222222-0000-4000-8000-000000000002";

async function loadStore() {
  vi.resetModules();
  return import("./active-household-store");
}

test("starts on everything", async () => {
  const store = await loadStore();

  expect(store.readActiveHouseholdId()).toBeUndefined();
  expect(renderHook(() => store.useActiveHouseholdId()).result.current).toBeUndefined();
});

test("restores the stored household and clears it again", async () => {
  seedPreferences({ activeHouseholdId: family });

  const store = await loadStore();
  const { result } = renderHook(() => store.useActiveHouseholdId());
  expect(result.current).toBe(family);

  act(() => store.setActiveHousehold(garden));
  expect(result.current).toBe(garden);
  expect(storedPreferences().activeHouseholdId).toBe(garden);

  act(() => store.setActiveHousehold(undefined));
  expect(result.current).toBeUndefined();
  expect(store.readActiveHouseholdId()).toBeUndefined();
});

test("a value that is not an id is dropped", async () => {
  seedPreferences({ activeHouseholdId: "not-an-id" });

  const store = await loadStore();

  expect(store.readActiveHouseholdId()).toBeUndefined();
});

test("sharing defaults follow the active household and ignore one the user left", async () => {
  seedPreferences({ activeHouseholdId: family });
  const store = await loadStore();

  const active = renderHook(() => store.useSharingDefaults([{ id: family }])).result.current;
  const stale = renderHook(() => store.useSharingDefaults([{ id: garden }])).result.current;

  expect(active).toEqual({ scope: "shared", householdId: family });
  expect(stale).toEqual({ scope: "personal", householdId: "" });
});
