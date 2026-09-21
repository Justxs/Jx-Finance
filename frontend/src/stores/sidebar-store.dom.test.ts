import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import { freshModuleLoader } from "@/test/fresh-module";
import { blockStorage, seedPreferences, storedPreferences } from "@/test/preferences";

const loadStore = await freshModuleLoader(() => import("./sidebar-store"));

test("starts expanded", async () => {
  const store = await loadStore();

  expect(renderHook(() => store.useSidebarCollapsed()).result.current.collapsed).toBe(false);
});

test("restores the collapsed state", async () => {
  seedPreferences({ sidebarCollapsed: true });

  const store = await loadStore();

  expect(renderHook(() => store.useSidebarCollapsed()).result.current.collapsed).toBe(true);
});

test("toggling flips the state and stores it", async () => {
  const store = await loadStore();
  const { result } = renderHook(() => store.useSidebarCollapsed());

  act(() => result.current.toggleSidebar());
  expect(result.current.collapsed).toBe(true);
  expect(storedPreferences().sidebarCollapsed).toBe(true);

  act(() => store.toggleSidebar());
  expect(result.current.collapsed).toBe(false);
  expect(storedPreferences().sidebarCollapsed).toBe(false);
});

test("works without storage", async () => {
  blockStorage();
  const store = await loadStore();
  const { result } = renderHook(() => store.useSidebarCollapsed());

  expect(result.current.collapsed).toBe(false);

  act(() => result.current.toggleSidebar());
  expect(result.current.collapsed).toBe(true);
});
