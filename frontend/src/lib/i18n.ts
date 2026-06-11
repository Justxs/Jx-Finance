import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en/common.json";
import lt from "@/locales/lt/common.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { common: en },
    lt: { common: lt },
  },
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
