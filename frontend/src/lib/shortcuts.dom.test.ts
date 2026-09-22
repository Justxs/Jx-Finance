import { createSequenceMatcher } from "@tanstack/react-hotkeys";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  PREFIX_TIMEOUT_MS,
  SEARCH_SHORTCUT_TARGET,
  isModifierShortcut,
  registerShortcuts,
  type ShortcutFeature,
  shortcutKeyLabel,
  shortcuts,
  shouldIgnoreShortcut,
  toHotkeySteps,
  visibleShortcuts,
} from "./shortcuts";

const base = {
  defaultPrevented: false,
  repeat: false,
  editableTarget: false,
  dialogOpen: false,
  pathname: "/budgets",
};

describe("key map", () => {
  test("single keys map to one hotkey step", () => {
    const steps = Object.fromEntries(
      shortcuts
        .filter((shortcut) => shortcut.keys.length === 1)
        .map((shortcut) => [shortcut.id, toHotkeySteps(shortcut)]),
    );

    expect(steps).toEqual({
      "command-palette": ["Mod+K"],
      "new-transaction": ["N"],
      search: ["/"],
      help: [{ key: "?", shift: true }],
    });
  });

  test("only the palette carries a modifier, and its key is spelled out for the help list", () => {
    expect(shortcuts.filter(isModifierShortcut).map((shortcut) => shortcut.id)).toEqual([
      "command-palette",
    ]);
    expect(shortcutKeyLabel("Mod+K")).toMatch(/K$/u);
    expect(shortcutKeyLabel("g")).toBe("g");
  });

  test("go-to shortcuts map to a G sequence", () => {
    const goTo = shortcuts.filter((shortcut) => shortcut.group === "goTo");

    expect(goTo).toHaveLength(12);
    for (const shortcut of goTo) {
      expect(toHotkeySteps(shortcut)).toEqual(["G", shortcut.keys[1]?.toUpperCase()]);
    }
  });

  test("every shortcut has a unique id and key sequence", () => {
    const sequences = shortcuts.map((shortcut) => shortcut.keys.join(" "));
    const ids = shortcuts.map((shortcut) => shortcut.id);

    expect(new Set(sequences).size).toBe(sequences.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("sequences complete within the prefix timeout and expire after it", () => {
    let now = 0;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const matcher = createSequenceMatcher(["G", "B"], {
      timeout: PREFIX_TIMEOUT_MS,
      platform: "windows",
    });
    function press(key: string) {
      return matcher.match(new KeyboardEvent("keydown", { key }));
    }

    expect(press("g")).toBe(false);
    now += PREFIX_TIMEOUT_MS;
    expect(press("b")).toBe(true);

    expect(press("g")).toBe(false);
    now += PREFIX_TIMEOUT_MS + 1;
    expect(press("b")).toBe(false);
  });
});

describe("visibleShortcuts", () => {
  test("hides shortcuts of disabled features and keeps the rest", () => {
    const disabled = new Set<ShortcutFeature>(["budgets", "investments"]);
    const visible = visibleShortcuts((feature) => !disabled.has(feature)).map(
      (shortcut) => shortcut.id,
    );

    expect(visible).not.toContain("go-b");
    expect(visible).not.toContain("go-v");
    expect(visible).toEqual(expect.arrayContaining(["new-transaction", "search", "help", "go-d"]));
    expect(visibleShortcuts(() => true)).toHaveLength(shortcuts.length);
  });
});

describe("shouldIgnoreShortcut", () => {
  test("runs on an ordinary page", () => {
    expect(shouldIgnoreShortcut(base)).toBe(false);
  });

  test.each([
    { defaultPrevented: true },
    { repeat: true },
    { editableTarget: true },
    { dialogOpen: true },
    { pathname: "/login" },
    { pathname: "/setup" },
    { pathname: "/forgot-password" },
    { pathname: "/reset-password" },
    { pathname: "/verify-email" },
  ])("ignores %j", (override) => {
    expect(shouldIgnoreShortcut({ ...base, ...override })).toBe(true);
  });

  test("a shortcut with a modifier still runs while a field has focus", () => {
    expect(shouldIgnoreShortcut({ ...base, editableTarget: true, modified: true })).toBe(false);
  });

  test("a shortcut with a modifier still yields to another open dialog", () => {
    expect(shouldIgnoreShortcut({ ...base, dialogOpen: true, modified: true })).toBe(true);
  });
});

describe("registerShortcuts", () => {
  let unregister: (() => void) | undefined;

  function setup({
    pathname = "/budgets",
    helpOpen = false,
    paletteOpen = false,
    isFeatureEnabled,
  }: {
    pathname?: string;
    helpOpen?: boolean;
    paletteOpen?: boolean;
    isFeatureEnabled?: (feature: ShortcutFeature) => boolean;
  } = {}) {
    const navigate = vi.fn();
    const toggleHelp = vi.fn();
    const togglePalette = vi.fn();
    unregister = registerShortcuts(
      { state: { location: { pathname } }, navigate },
      {
        toggleHelp,
        isHelpOpen: () => helpOpen,
        togglePalette,
        isPaletteOpen: () => paletteOpen,
        isFeatureEnabled,
      },
    );
    return { navigate, toggleHelp, togglePalette, user: userEvent.setup() };
  }

  afterEach(() => {
    unregister?.();
    unregister = undefined;
    document.body.innerHTML = "";
  });

  test("n opens the new transaction dialog through the URL", async () => {
    const { navigate, user } = setup();

    await user.keyboard("n");

    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      to: "/transactions",
      search: { new: true },
    });
  });

  test("the modifier shortcut opens the palette, and opens it again while typing", async () => {
    const { togglePalette, navigate, user } = setup();

    await user.keyboard("{Control>}k{/Control}");
    expect(togglePalette).toHaveBeenCalledOnce();

    const input = document.createElement("input");
    document.body.replaceChildren(input);
    await user.click(input);
    await user.keyboard("{Control>}k{/Control}");

    expect(togglePalette).toHaveBeenCalledTimes(2);
    expect(navigate).not.toHaveBeenCalled();
  });

  test("the palette's own dialog does not block its shortcut, another dialog does", async () => {
    const open = setup({ paletteOpen: true });
    document.body.innerHTML = '<div role="dialog"></div>';
    await open.user.keyboard("{Control>}k{/Control}");
    expect(open.togglePalette).toHaveBeenCalledOnce();

    open.togglePalette.mockClear();
    unregister?.();

    const blocked = setup();
    document.body.innerHTML = '<div role="dialog"></div>';
    await blocked.user.keyboard("{Control>}k{/Control}");
    expect(blocked.togglePalette).not.toHaveBeenCalled();
  });

  test("g then a letter navigates", async () => {
    const { navigate, user } = setup();

    await user.keyboard("gb");

    expect(navigate).toHaveBeenCalledExactlyOnceWith({ to: "/budgets", search: undefined });
  });

  test("go-to shortcuts of disabled features do nothing", async () => {
    const { navigate, user } = setup({ isFeatureEnabled: (feature) => feature !== "budgets" });

    await user.keyboard("gb");
    expect(navigate).not.toHaveBeenCalled();

    await user.keyboard("gt");
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ to: "/transactions", search: undefined });
  });

  test("? toggles help", async () => {
    const { navigate, toggleHelp, user } = setup();

    await user.keyboard("{Shift>}?{/Shift}");

    expect(toggleHelp).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  test("acting while help is open closes it first", async () => {
    const { navigate, toggleHelp, user } = setup({ helpOpen: true });
    document.body.innerHTML = '<div role="dialog"></div>';

    await user.keyboard("n");

    expect(toggleHelp).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
  });

  test("/ focuses the search input of the page", async () => {
    const { navigate, user } = setup();
    document.body.innerHTML = `<div><input data-shortcut="${SEARCH_SHORTCUT_TARGET}" /></div>`;

    await user.keyboard("/");

    expect(document.activeElement).toBe(document.querySelector("input"));
    expect(navigate).not.toHaveBeenCalled();
  });

  test("/ clicks a non-input search target", async () => {
    const { navigate, user } = setup();
    document.body.innerHTML = `<button type="button" data-shortcut="${SEARCH_SHORTCUT_TARGET}">Filters</button>`;
    const onClick = vi.fn();
    document.querySelector("button")?.addEventListener("click", onClick);

    await user.keyboard("/");

    expect(onClick).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  test("/ goes to transactions when the page has nothing to search", async () => {
    const { navigate, user } = setup();

    await user.keyboard("/");

    expect(navigate).toHaveBeenCalledExactlyOnceWith({ to: "/transactions" });
  });

  test("typing in a field is left alone", async () => {
    const { navigate, toggleHelp, user } = setup();
    const input = document.createElement("input");
    document.body.replaceChildren(input);
    await user.click(input);
    await user.keyboard("n{Shift>}?{/Shift}");

    expect(navigate).not.toHaveBeenCalled();
    expect(toggleHelp).not.toHaveBeenCalled();
    expect(document.querySelector("input")).toHaveValue("n?");
  });

  test("an open dialog blocks shortcuts", async () => {
    const { navigate, user } = setup();
    document.body.innerHTML = '<div role="alertdialog"></div>';

    await user.keyboard("n");

    expect(navigate).not.toHaveBeenCalled();
  });

  test("the login page has no shortcuts", async () => {
    const { navigate, user } = setup({ pathname: "/login" });

    await user.keyboard("n");

    expect(navigate).not.toHaveBeenCalled();
  });

  test("unregistering removes every shortcut", async () => {
    const { navigate, toggleHelp, user } = setup();
    unregister?.();

    await user.keyboard("ngb{Shift>}?{/Shift}");

    expect(navigate).not.toHaveBeenCalled();
    expect(toggleHelp).not.toHaveBeenCalled();
  });
});
