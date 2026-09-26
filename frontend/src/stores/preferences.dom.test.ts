import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { freshModuleLoader } from "@/test/fresh-module";
import { blockStorage, seedPreferences, storedPreferences } from "@/test/preferences";
import {
  DEFAULT_FONT,
  DEFAULT_PALETTE,
  DEFAULT_TEXT_SIZE,
  PREFERENCES_STORAGE_KEY,
} from "./preferences";

const loadPreferences = await freshModuleLoader(() => import("./preferences"));

const defaults = {
  id: "browser",
  palette: DEFAULT_PALETTE,
  font: DEFAULT_FONT,
  textSize: DEFAULT_TEXT_SIZE,
  sidebarCollapsed: false,
};

describe("reading", () => {
  test("nothing stored gives the defaults and writes nothing", async () => {
    const preferences = await loadPreferences();

    expect(preferences.readPreferences()).toEqual(defaults);
    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBeNull();
  });

  test("stored values outside the schema fall back field by field", async () => {
    seedPreferences({ theme: "neon", palette: "plum", font: 7, sidebarCollapsed: "yes" });

    const preferences = await loadPreferences();

    expect(preferences.readPreferences()).toEqual({ ...defaults, palette: "plum" });
  });

  test("unreadable JSON gives the defaults", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(PREFERENCES_STORAGE_KEY, "{not json");

    const preferences = await loadPreferences();

    expect(preferences.readPreferences()).toEqual(defaults);
  });

  test("the hook keeps its snapshot identity until something changes", async () => {
    const preferences = await loadPreferences();
    const { result, rerender } = renderHook(() => preferences.usePreferences());
    const first = result.current;

    rerender();
    expect(result.current).toBe(first);

    act(() => preferences.savePreferences({ palette: "sepia" }));

    expect(result.current).not.toBe(first);
  });
});

describe("writing", () => {
  test("the first write inserts the row and later writes update it", async () => {
    const preferences = await loadPreferences();

    preferences.savePreferences({ theme: "dark" });
    preferences.savePreferences({ font: "inter" });

    expect(storedPreferences()).toEqual({ ...defaults, theme: "dark", font: "inter" });
  });

  test("a value outside the schema is refused", async () => {
    const preferences = await loadPreferences();
    preferences.savePreferences({ palette: "plum" });

    expect(() =>
      preferences.preferencesCollection.update("browser", (draft) => {
        Object.assign(draft, { id: "someone-else" });
      }),
    ).toThrow();
    expect(storedPreferences().id).toBe("browser");
  });

  test("the hook follows writes", async () => {
    const preferences = await loadPreferences();
    const { result } = renderHook(() => preferences.usePreferences());

    act(() => preferences.savePreferences({ textSize: "large" }));

    expect(result.current.textSize).toBe("large");
  });

  test("a change made in another tab reaches the hook", async () => {
    const preferences = await loadPreferences();
    const { result } = renderHook(() => preferences.usePreferences());

    act(() => {
      seedPreferences({ palette: "graphite" });
      globalThis.dispatchEvent(
        new StorageEvent("storage", { key: PREFERENCES_STORAGE_KEY, storageArea: localStorage }),
      );
    });

    expect(result.current.palette).toBe("graphite");
  });
});

describe("blocked storage", () => {
  test("loads with the defaults and keeps changes for the session", async () => {
    blockStorage();

    const preferences = await loadPreferences();
    const { result } = renderHook(() => preferences.usePreferences());

    expect(result.current).toEqual(defaults);

    act(() => preferences.savePreferences({ theme: "dark", sidebarCollapsed: true }));

    expect(result.current.theme).toBe("dark");
    expect(result.current.sidebarCollapsed).toBe(true);
  });
});
