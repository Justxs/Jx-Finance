import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import { openStore } from "./open-store";

test("starts closed", () => {
  expect(openStore().isOpen()).toBe(false);
});

test("toggling opens and closes", () => {
  const store = openStore();

  store.toggle();
  expect(store.isOpen()).toBe(true);

  store.toggle();
  expect(store.isOpen()).toBe(false);
});

test("the hook follows the store and can set it", () => {
  const store = openStore();
  const { result } = renderHook(() => store.useOpen());

  act(() => store.toggle());
  expect(result.current.open).toBe(true);

  act(() => result.current.setOpen(false));
  expect(result.current.open).toBe(false);
  expect(store.isOpen()).toBe(false);
});

test("each store keeps its own state", () => {
  const first = openStore();
  const second = openStore();

  first.setOpen(true);

  expect(second.isOpen()).toBe(false);
});
