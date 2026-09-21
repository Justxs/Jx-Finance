import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import {
  isCommandPaletteOpen,
  readCommandRecents,
  rememberCommand,
  setCommandPaletteOpen,
  toggleCommandPalette,
  useCommandPaletteOpen,
  useCommandRecents,
} from "./command-palette-store";
import { COMMAND_RECENTS_MAX, preferencesCollection } from "./preferences";

const ROW_ID = "browser";

beforeEach(() => {
  if (preferencesCollection.has(ROW_ID)) {
    preferencesCollection.delete(ROW_ID);
  }
});

afterEach(() => {
  setCommandPaletteOpen(false);
});

test("starts closed and toggles", () => {
  expect(isCommandPaletteOpen()).toBe(false);

  toggleCommandPalette();
  expect(isCommandPaletteOpen()).toBe(true);

  toggleCommandPalette();
  expect(isCommandPaletteOpen()).toBe(false);
});

test("the open hook follows the store and can set it", () => {
  const { result } = renderHook(() => useCommandPaletteOpen());

  act(() => toggleCommandPalette());
  expect(result.current.open).toBe(true);

  act(() => result.current.setOpen(false));
  expect(result.current.open).toBe(false);
});

test("remembering puts an entry first, without repeating it", () => {
  rememberCommand("page-trash");
  rememberCommand("action-backup");
  rememberCommand("page-trash");

  expect(readCommandRecents()).toEqual(["page-trash", "action-backup"]);
});

test("only the newest entries are kept", () => {
  for (let index = 0; index <= COMMAND_RECENTS_MAX; index += 1) {
    rememberCommand(`entry-${index}`);
  }

  const recents = readCommandRecents();
  expect(recents).toHaveLength(COMMAND_RECENTS_MAX);
  expect(recents[0]).toBe(`entry-${COMMAND_RECENTS_MAX}`);
  expect(recents).not.toContain("entry-0");
});

test("the recents hook follows what was remembered", () => {
  const { result } = renderHook(() => useCommandRecents());

  expect(result.current).toEqual([]);

  act(() => rememberCommand("page-tags"));

  expect(result.current).toEqual(["page-tags"]);
});
