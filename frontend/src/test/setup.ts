import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { i18n } from "@/lib/i18n";

function installMatchMedia() {
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }),
  });
}

installMatchMedia();

beforeEach(() => {
  installMatchMedia();
});

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("en");
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-palette");
});
