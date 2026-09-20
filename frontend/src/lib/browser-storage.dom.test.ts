import { describe, expect, test, vi } from "vitest";
import { blockStorage } from "@/test/preferences";
import { browserStorage, createMemoryStorage } from "./browser-storage";

describe("browserStorage", () => {
  test("is the device storage when it works, and leaves no probe behind", () => {
    expect(browserStorage()).toBe(localStorage);
    expect(localStorage).toHaveLength(0);
  });

  test("falls back to memory when reading the property throws", () => {
    blockStorage();

    const storage = browserStorage();
    storage.setItem("jx-test", "value");

    expect(storage.getItem("jx-test")).toBe("value");
  });

  test("falls back to memory when writing throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded.", "QuotaExceededError");
    });

    expect(browserStorage()).not.toBe(localStorage);
  });
});

describe("createMemoryStorage", () => {
  test("stores, reads and removes", () => {
    const storage = createMemoryStorage();

    expect(storage.getItem("missing")).toBeNull();

    storage.setItem("key", "value");
    expect(storage.getItem("key")).toBe("value");

    storage.removeItem("key");
    expect(storage.getItem("key")).toBeNull();
  });
});
