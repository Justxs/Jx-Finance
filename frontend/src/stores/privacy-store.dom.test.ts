import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import { freshModuleLoader } from "@/test/fresh-module";
import { blockStorage, seedPreferences, storedPreferences } from "@/test/preferences";

const loadStore = await freshModuleLoader(() => import("./privacy-store"));

test("starts with amounts shown", async () => {
  const store = await loadStore();

  expect(renderHook(() => store.useAmountsHidden()).result.current).toBe(false);
});

test("restores hidden amounts", async () => {
  seedPreferences({ amountsHidden: true });

  const store = await loadStore();

  expect(renderHook(() => store.useAmountsHidden()).result.current).toBe(true);
});

test("toggling flips the state and stores it", async () => {
  const store = await loadStore();
  const { result } = renderHook(() => store.useAmountsHidden());

  act(() => store.toggleAmountsHidden());
  expect(result.current).toBe(true);
  expect(storedPreferences().amountsHidden).toBe(true);

  act(() => store.toggleAmountsHidden());
  expect(result.current).toBe(false);
  expect(storedPreferences().amountsHidden).toBe(false);
});

test("works without storage", async () => {
  blockStorage();
  const store = await loadStore();
  const { result } = renderHook(() => store.useAmountsHidden());

  act(() => store.toggleAmountsHidden());
  expect(result.current).toBe(true);
});
