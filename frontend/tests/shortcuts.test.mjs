import assert from "node:assert/strict";
import test from "node:test";
import { createSequenceMatcher } from "@tanstack/react-hotkeys";
import {
  PREFIX_TIMEOUT_MS,
  shortcuts,
  shouldIgnoreShortcut,
  toHotkeySteps,
} from "../src/lib/shortcuts.ts";

const base = {
  defaultPrevented: false,
  repeat: false,
  editableTarget: false,
  dialogOpen: false,
  pathname: "/budgets",
};

test("single keys map to one hotkey step", () => {
  const steps = Object.fromEntries(
    shortcuts
      .filter((shortcut) => shortcut.keys.length === 1)
      .map((shortcut) => [shortcut.id, toHotkeySteps(shortcut)]),
  );
  assert.deepEqual(steps, {
    "new-transaction": ["N"],
    search: ["/"],
    help: [{ key: "?", shift: true }],
  });
});

test("go-to shortcuts map to a G sequence", () => {
  const goTo = shortcuts.filter((shortcut) => shortcut.group === "goTo");
  assert.equal(goTo.length, 11);
  for (const shortcut of goTo) {
    assert.deepEqual(toHotkeySteps(shortcut), ["G", shortcut.keys[1].toUpperCase()]);
  }
});

test("sequences complete within the prefix timeout and expire after it", () => {
  const realNow = Date.now;
  let now = 0;
  Date.now = () => now;
  try {
    const matcher = createSequenceMatcher(["G", "B"], {
      timeout: PREFIX_TIMEOUT_MS,
      platform: "windows",
    });
    function press(key) {
      return matcher.match({
        key,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
      });
    }

    assert.equal(press("g"), false);
    now += PREFIX_TIMEOUT_MS;
    assert.equal(press("b"), true);

    assert.equal(press("g"), false);
    now += PREFIX_TIMEOUT_MS + 1;
    assert.equal(press("b"), false);
  } finally {
    Date.now = realNow;
  }
});

test("ignore rules", () => {
  assert.equal(shouldIgnoreShortcut(base), false);
  for (const override of [
    { defaultPrevented: true },
    { repeat: true },
    { editableTarget: true },
    { dialogOpen: true },
    { pathname: "/login" },
    { pathname: "/setup" },
  ]) {
    assert.equal(shouldIgnoreShortcut({ ...base, ...override }), true, JSON.stringify(override));
  }
});

test("every shortcut has a unique key sequence", () => {
  const sequences = shortcuts.map((shortcut) => shortcut.keys.join(" "));
  assert.equal(new Set(sequences).size, sequences.length);
});
