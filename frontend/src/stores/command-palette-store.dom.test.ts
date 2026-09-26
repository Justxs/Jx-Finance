import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { readCommandRecents, rememberCommand, useCommandRecents } from "./command-palette-store";
import { COMMAND_RECENTS_MAX, preferencesCollection } from "./preferences";

const ROW_ID = "browser";

beforeEach(() => {
  if (preferencesCollection.has(ROW_ID)) {
    preferencesCollection.delete(ROW_ID);
  }
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
