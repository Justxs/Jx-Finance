import { Store, useSelector } from "@tanstack/react-store";
import { i18n } from "@/lib/i18n";
import {
  type Preferences,
  locales,
  onPreferencesChange,
  readPreferences,
  savePreferences,
  usePreferences,
} from "./preferences";

export type Locale = NonNullable<Preferences["locale"]>;

export const localeNames: Record<Locale, string> = { en: "English", lt: "Lietuvių" };

export const nextLocale: Record<Locale, Locale> = { en: "lt", lt: "en" };

const fallbackLocale = new Store<Locale>("en");

function isLocale(value: unknown): value is Locale {
  return locales.some((locale) => locale === value);
}

function applyLocale(next: Locale) {
  document.documentElement.lang = next;
  if (i18n.language !== next) {
    void i18n.changeLanguage(next);
  }
}

function applyChosenLocale() {
  const chosen = readPreferences().locale;
  if (chosen) {
    applyLocale(chosen);
  }
}

onPreferencesChange(applyChosenLocale);

export function setLocale(next: Locale) {
  savePreferences({ locale: next });
  applyLocale(next);
}

export async function initLocale(loadDefault: () => Promise<string | null | undefined>) {
  const stored = readPreferences().locale;
  if (stored) {
    applyLocale(stored);
    return;
  }

  const fallback = await loadDefault().catch(() => null);
  if (readPreferences().locale) {
    return;
  }

  if (isLocale(fallback)) {
    fallbackLocale.setState(() => fallback);
  }
  applyLocale(fallbackLocale.state);
}

export function useLocale() {
  const fallback = useSelector(fallbackLocale, (locale) => locale);
  const locale = usePreferences().locale ?? fallback;
  return { locale, setLocale };
}
