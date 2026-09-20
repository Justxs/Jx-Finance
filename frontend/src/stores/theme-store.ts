import {
  type Preferences,
  fonts,
  onPreferencesChange,
  palettes,
  readPreferences,
  savePreferences,
  textSizes,
  usePreferences,
} from "./preferences";

export { fonts, palettes, textSizes };

export type Theme = NonNullable<Preferences["theme"]>;
export type Palette = Preferences["palette"];
export type Font = Preferences["font"];
export type TextSize = Preferences["textSize"];

function systemTheme(): Theme {
  return globalThis.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setDataAttribute(name: "palette" | "font" | "textSize", value: string, standard: string) {
  if (value === standard) {
    delete document.documentElement.dataset[name];
  } else {
    document.documentElement.dataset[name] = value;
  }
}

function applyAppearance() {
  const preferences = readPreferences();
  document.documentElement.classList.toggle(
    "dark",
    (preferences.theme ?? systemTheme()) === "dark",
  );
  setDataAttribute("palette", preferences.palette, "ledger");
  setDataAttribute("font", preferences.font, "ledger");
  setDataAttribute("textSize", preferences.textSize, "default");
}

applyAppearance();
onPreferencesChange(applyAppearance);

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
  const theme = usePreferences().theme ?? systemTheme();
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
