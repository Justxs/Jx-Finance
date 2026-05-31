import { Store } from "@tanstack/store";
import { useStore } from "@tanstack/react-store";
import i18n from "../lib/i18n";

export type Locale = "en" | "lt";

interface AppState {
  locale: Locale;
}

const initialState: AppState = {
  locale: "en",
};

export const appStore = new Store<AppState>(initialState);

export const setLocale = (next: Locale) => {
  appStore.setState((state) => ({ ...state, locale: next }));
  i18n.changeLanguage(next).catch(() => undefined);
};

export const useLocale = () => {
  const locale = useStore(appStore, (state) => state.locale);
  return { locale, setLocale };
};
