import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import {
  isShortcutsHelpOpen,
  setShortcutsHelpOpen,
  toggleShortcutsHelp,
  useShortcutsHelpOpen,
} from "./shortcuts-help-store";

afterEach(() => {
  setShortcutsHelpOpen(false);
});

test("starts closed", () => {
  expect(isShortcutsHelpOpen()).toBe(false);
});

test("toggling opens and closes", () => {
  toggleShortcutsHelp();
  expect(isShortcutsHelpOpen()).toBe(true);

  toggleShortcutsHelp();
  expect(isShortcutsHelpOpen()).toBe(false);
});

test("the hook follows the store and can set it", () => {
  const { result } = renderHook(() => useShortcutsHelpOpen());

  act(() => toggleShortcutsHelp());
  expect(result.current.open).toBe(true);

  act(() => result.current.setOpen(false));
  expect(result.current.open).toBe(false);
  expect(isShortcutsHelpOpen()).toBe(false);
});
