import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { blockStorage, seedPreferences, storedPreferences } from "@/test/preferences";

async function loadStore() {
  vi.resetModules();
  return import("./theme-store");
}

function preferDark() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-color-scheme: dark)",
  }));
}

function root() {
  return document.documentElement;
}

describe("initial theme", () => {
  test("a stored theme wins over the system preference", async () => {
    preferDark();
    seedPreferences({ theme: "light" });

    const store = await loadStore();

    expect(renderHook(() => store.useTheme()).result.current.theme).toBe("light");
    expect(root()).not.toHaveClass("dark");
  });

  test("follows the system preference without a stored theme", async () => {
    preferDark();

    const store = await loadStore();

    expect(renderHook(() => store.useTheme()).result.current.theme).toBe("dark");
    expect(root()).toHaveClass("dark");
  });

  test("ignores a corrupt stored theme", async () => {
    seedPreferences({ theme: "neon" });

    const store = await loadStore();

    expect(renderHook(() => store.useTheme()).result.current.theme).toBe("light");
  });
});

describe("theme changes", () => {
  test("setTheme updates the hook, the document and storage", async () => {
    const store = await loadStore();
    const { result } = renderHook(() => store.useTheme());

    act(() => store.setTheme("dark"));

    expect(result.current.theme).toBe("dark");
    expect(root()).toHaveClass("dark");
    expect(storedPreferences().theme).toBe("dark");
  });

  test("toggleTheme flips back and forth", async () => {
    const store = await loadStore();
    const { result } = renderHook(() => store.useTheme());

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("dark");

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("light");
    expect(root()).not.toHaveClass("dark");
    expect(storedPreferences().theme).toBe("light");
  });
});

describe("palette", () => {
  test("defaults to ledger, which sets no attribute", async () => {
    seedPreferences({ palette: "neon" });

    const store = await loadStore();

    expect(renderHook(() => store.usePalette()).result.current.palette).toBe("ledger");
    expect(root()).not.toHaveAttribute("data-palette");
  });

  test("restores a stored palette", async () => {
    seedPreferences({ palette: "plum" });

    const store = await loadStore();

    expect(renderHook(() => store.usePalette()).result.current.palette).toBe("plum");
    expect(root()).toHaveAttribute("data-palette", "plum");
  });

  test("setPalette applies and stores, and ledger clears the attribute", async () => {
    const store = await loadStore();
    const { result } = renderHook(() => store.usePalette());

    act(() => store.setPalette("sepia"));
    expect(result.current.palette).toBe("sepia");
    expect(root()).toHaveAttribute("data-palette", "sepia");
    expect(storedPreferences().palette).toBe("sepia");

    act(() => store.setPalette("ledger"));
    expect(root()).not.toHaveAttribute("data-palette");
    expect(storedPreferences().palette).toBe("ledger");
  });
});

describe("font and text size", () => {
  test("default to ledger and default, which set no attributes", async () => {
    seedPreferences({ font: "comic" });
    seedPreferences({ textSize: "huge" });

    const store = await loadStore();

    expect(renderHook(() => store.useFont()).result.current.font).toBe("ledger");
    expect(renderHook(() => store.useTextSize()).result.current.textSize).toBe("default");
    expect(root()).not.toHaveAttribute("data-font");
    expect(root()).not.toHaveAttribute("data-text-size");
  });

  test("restore stored values", async () => {
    seedPreferences({ font: "system" });
    seedPreferences({ textSize: "large" });

    const store = await loadStore();

    expect(renderHook(() => store.useFont()).result.current.font).toBe("system");
    expect(root()).toHaveAttribute("data-font", "system");
    expect(root()).toHaveAttribute("data-text-size", "large");
  });

  test("setters apply and store, and defaults clear the attributes", async () => {
    const store = await loadStore();
    const { result } = renderHook(() => store.useTextSize());

    act(() => store.setFont("serif"));
    act(() => store.setTextSize("small"));
    expect(result.current.textSize).toBe("small");
    expect(root()).toHaveAttribute("data-font", "serif");
    expect(root()).toHaveAttribute("data-text-size", "small");
    expect(storedPreferences().font).toBe("serif");
    expect(storedPreferences().textSize).toBe("small");

    act(() => store.setFont("ledger"));
    act(() => store.setTextSize("default"));
    expect(root()).not.toHaveAttribute("data-font");
    expect(root()).not.toHaveAttribute("data-text-size");
  });
});

describe("blocked storage", () => {
  test("loads with the system preference and the defaults", async () => {
    preferDark();
    blockStorage();

    const store = await loadStore();

    expect(renderHook(() => store.useTheme()).result.current.theme).toBe("dark");
    expect(renderHook(() => store.usePalette()).result.current.palette).toBe("ledger");
    expect(renderHook(() => store.useFont()).result.current.font).toBe("ledger");
    expect(renderHook(() => store.useTextSize()).result.current.textSize).toBe("default");
  });

  test("changes still apply for the session", async () => {
    blockStorage();
    const store = await loadStore();

    act(() => {
      store.setTheme("dark");
      store.setPalette("plum");
      store.setFont("inter");
      store.setTextSize("large");
    });

    expect(root()).toHaveClass("dark");
    expect(root().dataset.palette).toBe("plum");
    expect(root().dataset.font).toBe("inter");
    expect(root().dataset.textSize).toBe("large");
  });
});
