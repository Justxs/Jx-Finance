import { useSyncExternalStore } from "react";
import {
  DEFAULT_FONT,
  DEFAULT_PALETTE,
  DEFAULT_TEXT_SIZE,
  type Preferences,
  fonts,
  onPreferencesChange,
  palettes,
  readPreferences,
  savePreferences,
  textSizes,
  themes,
  usePreferences,
} from "./preferences";

export { fonts, palettes, textSizes, themes };

export type Theme = NonNullable<Preferences["theme"]>;
export type Palette = Preferences["palette"];
type Font = Preferences["font"];
type TextSize = Preferences["textSize"];

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

function systemTheme(): Theme {
  return globalThis.matchMedia(DARK_SCHEME_QUERY).matches ? "dark" : "light";
}

function subscribeToSystemTheme(onChange: () => void) {
  const query = globalThis.matchMedia(DARK_SCHEME_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function setDataAttribute(name: "palette" | "font" | "textSize", value: string, standard: string) {
  if (value === standard) {
    delete document.documentElement.dataset[name];
  } else {
    document.documentElement.dataset[name] = value;
  }
}

function syncThemeColor() {
  const sidebar = getComputedStyle(document.documentElement).getPropertyValue("--sidebar").trim();
  if (!sidebar) {
    return;
  }
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = sidebar;
  }
}

function applyAppearance() {
  const preferences = readPreferences();
  document.documentElement.classList.toggle(
    "dark",
    (preferences.theme ?? systemTheme()) === "dark",
  );
  setDataAttribute("palette", preferences.palette, DEFAULT_PALETTE);
  setDataAttribute("font", preferences.font, DEFAULT_FONT);
  setDataAttribute("textSize", preferences.textSize, DEFAULT_TEXT_SIZE);
  syncThemeColor();
}

applyAppearance();
onPreferencesChange(applyAppearance);
subscribeToSystemTheme(applyAppearance);

export function setTheme(theme: Theme) {
  savePreferences({ theme });
}

export function toggleTheme() {
  setTheme((readPreferences().theme ?? systemTheme()) === "dark" ? "light" : "dark");
}

export function setPalette(palette: Palette) {
  savePreferences({ palette });
}

export function setFont(font: Font) {
  savePreferences({ font });
}

export function setTextSize(textSize: TextSize) {
  savePreferences({ textSize });
}

export function useTheme() {
  const system = useSyncExternalStore(subscribeToSystemTheme, systemTheme);
  const theme = usePreferences().theme ?? system;
  return { theme, setTheme, toggleTheme };
}

export function usePalette() {
  const { palette } = usePreferences();
  return { palette, setPalette };
}

export function useFont() {
  const { font } = usePreferences();
  return { font, setFont };
}

export function useTextSize() {
  const { textSize } = usePreferences();
  return { textSize, setTextSize };
}
