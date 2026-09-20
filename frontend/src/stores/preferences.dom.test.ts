import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { blockStorage, seedPreferences, storedPreferences } from "@/test/preferences";

async function loadPreferences() {
  vi.resetModules();
  return import("./preferences");
}

const defaults = {
  id: "browser",
  palette: "ledger",
  font: "ledger",
  textSize: "default",
  sidebarCollapsed: false,
};

describe("reading", () => {
  test("nothing stored gives the defaults and writes nothing", async () => {
    const preferences = await loadPreferences();

    expect(preferences.readPreferences()).toEqual(defaults);
    expect(localStorage.getItem("jx-preferences")).toBeNull();
  });

  test("stored values outside the schema fall back field by field", async () => {
    seedPreferences({ theme: "neon", palette: "plum", font: 7, sidebarCollapsed: "yes" });

    const preferences = await loadPreferences();

    expect(preferences.readPreferences()).toEqual({ ...defaults, palette: "plum" });
  });

  test("unreadable JSON gives the defaults", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem("jx-preferences", "{not json");

    const preferences = await loadPreferences();

    expect(preferences.readPreferences()).toEqual(defaults);
  });

  test("the snapshot keeps its identity until something changes", async () => {
    const preferences = await loadPreferences();
    const first = preferences.readPreferences();

    expect(preferences.readPreferences()).toBe(first);

    preferences.savePreferences({ palette: "sepia" });

    expect(preferences.readPreferences()).not.toBe(first);
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
        new StorageEvent("storage", { key: "jx-preferences", storageArea: localStorage }),
      );
    });

    expect(result.current.palette).toBe("graphite");
  });
});

describe("migration from the single-value keys", () => {
  test("moves every old key into the row and removes it", async () => {
    localStorage.setItem("jx-theme", "dark");
    localStorage.setItem("jx-palette", "plum");
    localStorage.setItem("jx-font", "plex");
    localStorage.setItem("jx-text-size", "small");
    localStorage.setItem("jx-sidebar-collapsed", "true");
    localStorage.setItem("jx.locale", "lt");

    const preferences = await loadPreferences();

    const migrated = {
      id: "browser",
      theme: "dark",
      palette: "plum",
      font: "plex",
      textSize: "small",
      sidebarCollapsed: true,
      locale: "lt",
    };
    expect(preferences.readPreferences()).toEqual(migrated);
    expect(storedPreferences()).toEqual(migrated);
    expect(localStorage.getItem("jx-theme")).toBeNull();
    expect(localStorage.getItem("jx.locale")).toBeNull();
  });

  test("drops old values that are no longer valid", async () => {
    localStorage.setItem("jx-theme", "neon");
    localStorage.setItem("jx-palette", "sepia");

    const preferences = await loadPreferences();

    expect(preferences.readPreferences()).toEqual({ ...defaults, palette: "sepia" });
  });

  test("an existing row wins over leftover old keys", async () => {
    seedPreferences({ palette: "graphite" });
    localStorage.setItem("jx-palette", "plum");

    const preferences = await loadPreferences();

    expect(preferences.readPreferences().palette).toBe("graphite");
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
