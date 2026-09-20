import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { installNodeFormData, installScrollStub } from "./polyfills";

function installMatchMedia() {
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }),
  });
}

installMatchMedia();
installScrollStub();
await installNodeFormData();

beforeEach(() => {
  installMatchMedia();
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await i18n.changeLanguage("en");
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-palette");
  document.documentElement.removeAttribute("data-font");
  document.documentElement.removeAttribute("data-text-size");
});
