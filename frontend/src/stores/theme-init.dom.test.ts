import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { expect, test, vi } from "vitest";
import { freshModuleLoader } from "@/test/fresh-module";
import { blockStorage, seedPreferences } from "@/test/preferences";
import {
  DEFAULT_FONT,
  DEFAULT_PALETTE,
  DEFAULT_TEXT_SIZE,
  LEGACY_PREFERENCE_KEYS,
  PREFERENCES_STORAGE_KEY,
  fonts,
  palettes,
  textSizes,
} from "./preferences";

const loadPreferences = await freshModuleLoader(() => import("./preferences"));

const themeInit = new Script(readFileSync("public/theme-init.js", "utf8"), {
  filename: "public/theme-init.js",
});

function runThemeInit() {
  themeInit.runInThisContext();
}

function root() {
  return document.documentElement;
}

function preferDark() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-color-scheme: dark)",
  }));
}

test("applies what the preferences collection stored", async () => {
  const preferences = await loadPreferences();
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
  localStorage.setItem(LEGACY_PREFERENCE_KEYS.theme, "dark");
  localStorage.setItem(LEGACY_PREFERENCE_KEYS.palette, "sepia");

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
  ["unreadable JSON", () => localStorage.setItem(PREFERENCES_STORAGE_KEY, "{not json")],
])("%s falls back to the system preference", (_name, arrange) => {
  preferDark();
  arrange();

  runThemeInit();

  expect(root()).toHaveClass("dark");
});

const nonDefaultPalettes = palettes.filter((palette) => palette !== DEFAULT_PALETTE);
const nonDefaultFonts = fonts.filter((font) => font !== DEFAULT_FONT);
const nonDefaultTextSizes = textSizes.filter((textSize) => textSize !== DEFAULT_TEXT_SIZE);

test.each(nonDefaultPalettes)("applies the %s palette before the bundle loads", (palette) => {
  seedPreferences({ palette });

  runThemeInit();

  expect(root().dataset.palette).toBe(palette);
});

test.each(nonDefaultFonts)("applies the %s font before the bundle loads", (font) => {
  seedPreferences({ font });

  runThemeInit();

  expect(root().dataset.font).toBe(font);
});

test.each(nonDefaultTextSizes)("applies the %s text size before the bundle loads", (textSize) => {
  seedPreferences({ textSize });

  runThemeInit();

  expect(root().dataset.textSize).toBe(textSize);
});

test.each([
  ["palette", DEFAULT_PALETTE, () => root().dataset.palette],
  ["font", DEFAULT_FONT, () => root().dataset.font],
  ["textSize", DEFAULT_TEXT_SIZE, () => root().dataset.textSize],
])("leaves the default %s off the root", (name, value, read) => {
  seedPreferences({ [name]: value });

  runThemeInit();

  expect(read()).toBeUndefined();
});
