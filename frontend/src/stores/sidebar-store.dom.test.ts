import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";

async function loadStore() {
  vi.resetModules();
  return import("./sidebar-store");
}

test("starts expanded", async () => {
  const store = await loadStore();

  expect(renderHook(() => store.useSidebarCollapsed()).result.current.collapsed).toBe(false);
});

test("restores the collapsed state", async () => {
  localStorage.setItem("jx-sidebar-collapsed", "true");

  const store = await loadStore();

  expect(renderHook(() => store.useSidebarCollapsed()).result.current.collapsed).toBe(true);
});

test("toggling flips the state and stores it", async () => {
  const store = await loadStore();
  const { result } = renderHook(() => store.useSidebarCollapsed());

  act(() => result.current.toggleSidebar());
  expect(result.current.collapsed).toBe(true);
  expect(localStorage.getItem("jx-sidebar-collapsed")).toBe("true");

  act(() => store.toggleSidebar());
  expect(result.current.collapsed).toBe(false);
  expect(localStorage.getItem("jx-sidebar-collapsed")).toBe("false");
});
