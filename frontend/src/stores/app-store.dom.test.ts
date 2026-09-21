import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { freshModuleLoader } from "@/test/fresh-module";
import { seedPreferences, storedPreferences } from "@/test/preferences";

const loadStore = await freshModuleLoader(async () => {
  vi.doMock("@/lib/i18n", () => ({ i18n }));
  return import("./app-store");
});

afterEach(async () => {
  vi.doUnmock("@/lib/i18n");
  document.documentElement.lang = "en";
  await i18n.changeLanguage("en");
});

describe("initial locale", () => {
  test("defaults to English", async () => {
    const store = await loadStore();

    expect(renderHook(() => store.useLocale()).result.current.locale).toBe("en");
  });

  test("restores a stored locale and ignores junk", async () => {
    seedPreferences({ locale: "lt" });
    const lithuanian = await loadStore();
    expect(renderHook(() => lithuanian.useLocale()).result.current.locale).toBe("lt");

    seedPreferences({ locale: "de" });
    const junk = await loadStore();
    expect(renderHook(() => junk.useLocale()).result.current.locale).toBe("en");
  });
});

describe("setLocale", () => {
  test("switches the hook, the document, i18n and storage", async () => {
    const store = await loadStore();
    const { result } = renderHook(() => store.useLocale());

    act(() => result.current.setLocale("lt"));

    expect(result.current.locale).toBe("lt");
    expect(document.documentElement.lang).toBe("lt");
    expect(i18n.language).toBe("lt");
    expect(storedPreferences().locale).toBe("lt");
  });

  test("still switches when storage is blocked", async () => {
    const store = await loadStore();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    expect(() => store.setLocale("lt")).not.toThrow();
    expect(i18n.language).toBe("lt");
  });
});

describe("initLocale", () => {
  test("a stored locale wins and the instance default is not loaded", async () => {
    seedPreferences({ locale: "lt" });
    const store = await loadStore();
    const loadDefault = vi.fn(() => Promise.resolve("en"));

    await store.initLocale(loadDefault);

    expect(loadDefault).not.toHaveBeenCalled();
    expect(i18n.language).toBe("lt");
    expect(document.documentElement.lang).toBe("lt");
  });

  test("falls back to the instance default without storing it", async () => {
    const store = await loadStore();

    await store.initLocale(() => Promise.resolve("lt"));

    expect(i18n.language).toBe("lt");
    expect(storedPreferences().locale).toBeUndefined();
  });

  test.each([
    ["an unsupported default", () => Promise.resolve("de")],
    ["no default", () => Promise.resolve(null)],
    ["a failed load", () => Promise.reject(new Error("offline"))],
  ])("%s keeps English", async (_, loadDefault) => {
    const store = await loadStore();

    await store.initLocale(loadDefault);

    expect(i18n.language).toBe("en");
  });
});
