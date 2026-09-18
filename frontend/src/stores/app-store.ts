import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { i18n } from "@/lib/i18n";

export type Locale = "en" | "lt";

interface AppState {
  locale: Locale;
}

const LOCALE_KEY = "jx.locale";

function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "lt";
}

function readStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

const initialState: AppState = {
  locale: readStoredLocale() ?? "en",
};

const appStore = new Store<AppState>(initialState);

function applyLocale(next: Locale) {
  appStore.setState((state) => ({ ...state, locale: next }));
  document.documentElement.lang = next;
  void i18n.changeLanguage(next);
}

function storeLocale(next: Locale) {
  try {
    window.localStorage.setItem(LOCALE_KEY, next);
  } catch {}
}

export function setLocale(next: Locale) {
  applyLocale(next);
  storeLocale(next);
}

export async function initLocale(loadDefault: () => Promise<string | null | undefined>) {
  const stored = readStoredLocale();
  if (stored) {
    applyLocale(stored);
    return;
  }

  const fallback = await loadDefault().catch(() => null);
  if (isLocale(fallback)) {
    applyLocale(fallback);
  }
}

export function useLocale() {
  const locale = useSelector(appStore, (state) => state.locale);
  return { locale, setLocale };
}
