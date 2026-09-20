import { readFileSync } from "node:fs";
import { expect, test, vi } from "vitest";
import { blockStorage, seedPreferences } from "@/test/preferences";

const source = readFileSync("public/theme-init.js", "utf8");
const runThemeInit = new Function(source);

function root() {
  return document.documentElement;
}

function preferDark() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-color-scheme: dark)",
  }));
}

test("applies what the preferences collection stored", async () => {
  vi.resetModules();
  const preferences = await import("./preferences");
  preferences.savePreferences({ theme: "dark", palette: "plum", font: "plex", textSize: "large" });
  root().className = "";

  runThemeInit();

  expect(root()).toHaveClass("dark");
  expect(root().dataset.palette).toBe("plum");
  expect(root().dataset.font).toBe("plex");
  expect(root().dataset.textSize).toBe("large");
});

test("a stored light theme wins over a dark system", () => {
  preferDark();
  seedPreferences({ theme: "light" });

  runThemeInit();

  expect(root()).not.toHaveClass("dark");
});

test("reads the old single-value keys until the bundle has migrated them", () => {
  localStorage.setItem("jx-theme", "dark");
  localStorage.setItem("jx-palette", "sepia");

  runThemeInit();

  expect(root()).toHaveClass("dark");
  expect(root().dataset.palette).toBe("sepia");
});

test("ignores values it does not know", () => {
  seedPreferences({ theme: "neon", palette: "neon", font: "comic", textSize: "huge" });

  runThemeInit();

  expect(root()).not.toHaveClass("dark");
  expect(root().dataset.palette).toBeUndefined();
  expect(root().dataset.font).toBeUndefined();
  expect(root().dataset.textSize).toBeUndefined();
});

test.each([
  ["blocked storage", blockStorage],
  ["unreadable JSON", () => localStorage.setItem("jx-preferences", "{not json")],
])("%s falls back to the system preference", (_name, arrange) => {
  preferDark();
  arrange();

  runThemeInit();

  expect(root()).toHaveClass("dark");
});
