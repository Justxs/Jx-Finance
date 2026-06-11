import { Store } from "@tanstack/store";
import { useSelector } from "@tanstack/react-store";

export type Theme = "light" | "dark";

const STORAGE_KEY = "jx-theme";

function resolveInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return globalThis.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

const initialTheme = resolveInitialTheme();
applyTheme(initialTheme);

const themeStore = new Store<{ theme: Theme }>({ theme: initialTheme });

export function setTheme(theme: Theme) {
  themeStore.setState((state) => ({ ...state, theme }));
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

export function toggleTheme() {
  setTheme(themeStore.state.theme === "dark" ? "light" : "dark");
}

export function useTheme() {
  const theme = useSelector(themeStore, (state) => state.theme);
  return { theme, setTheme, toggleTheme };
}
