import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type Theme = "light" | "dark";

export const palettes = ["ledger", "plum", "sepia", "graphite"] as const;
export type Palette = (typeof palettes)[number];

export const fonts = [
  "ledger",
  "sans",
  "serif",
  "system",
  "inter",
  "hyperlegible",
  "plex",
  "editorial",
] as const;
export type Font = (typeof fonts)[number];

export const textSizes = ["small", "default", "large"] as const;
export type TextSize = (typeof textSizes)[number];

const STORAGE_KEY = "jx-theme";
const PALETTE_STORAGE_KEY = "jx-palette";
const FONT_STORAGE_KEY = "jx-font";
const TEXT_SIZE_STORAGE_KEY = "jx-text-size";

function resolveInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return globalThis.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveInitialPalette(): Palette {
  const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
  return palettes.find((palette) => palette === stored) ?? "ledger";
}

function resolveInitialFont(): Font {
  const stored = localStorage.getItem(FONT_STORAGE_KEY);
  return fonts.find((font) => font === stored) ?? "ledger";
}

function resolveInitialTextSize(): TextSize {
  const stored = localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
  return textSizes.find((textSize) => textSize === stored) ?? "default";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function applyPalette(palette: Palette) {
  if (palette === "ledger") {
    delete document.documentElement.dataset.palette;
  } else {
    document.documentElement.dataset.palette = palette;
  }
}

function applyFont(font: Font) {
  if (font === "ledger") {
    delete document.documentElement.dataset.font;
  } else {
    document.documentElement.dataset.font = font;
  }
}

function applyTextSize(textSize: TextSize) {
  if (textSize === "default") {
    delete document.documentElement.dataset.textSize;
  } else {
    document.documentElement.dataset.textSize = textSize;
  }
}

const initialTheme = resolveInitialTheme();
const initialPalette = resolveInitialPalette();
const initialFont = resolveInitialFont();
const initialTextSize = resolveInitialTextSize();
applyTheme(initialTheme);
applyPalette(initialPalette);
applyFont(initialFont);
applyTextSize(initialTextSize);

const themeStore = new Store<{
  theme: Theme;
  palette: Palette;
  font: Font;
  textSize: TextSize;
}>({
  theme: initialTheme,
  palette: initialPalette,
  font: initialFont,
  textSize: initialTextSize,
});

export function setTheme(theme: Theme) {
  themeStore.setState((state) => ({ ...state, theme }));
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

export function toggleTheme() {
  setTheme(themeStore.state.theme === "dark" ? "light" : "dark");
}

export function setPalette(palette: Palette) {
  themeStore.setState((state) => ({ ...state, palette }));
  localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  applyPalette(palette);
}

export function setFont(font: Font) {
  themeStore.setState((state) => ({ ...state, font }));
  localStorage.setItem(FONT_STORAGE_KEY, font);
  applyFont(font);
}

export function setTextSize(textSize: TextSize) {
  themeStore.setState((state) => ({ ...state, textSize }));
  localStorage.setItem(TEXT_SIZE_STORAGE_KEY, textSize);
  applyTextSize(textSize);
}

export function useTheme() {
  const theme = useSelector(themeStore, (state) => state.theme);
  return { theme, setTheme, toggleTheme };
}

export function usePalette() {
  const palette = useSelector(themeStore, (state) => state.palette);
  return { palette, setPalette };
}

export function useFont() {
  const font = useSelector(themeStore, (state) => state.font);
  return { font, setFont };
}

export function useTextSize() {
  const textSize = useSelector(themeStore, (state) => state.textSize);
  return { textSize, setTextSize };
}
