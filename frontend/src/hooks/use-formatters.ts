import { useTranslation } from "react-i18next";

// React Compiler memoizes these per i18n.language — no manual useMemo needed.
export const useMoney = () => {
  const { i18n } = useTranslation();

  return new Intl.NumberFormat(i18n.language, {
    style: "currency",
    currency: "EUR",
    currencyDisplay: "symbol",
  });
};

export const useDate = () => {
  const { i18n } = useTranslation();

  return new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
  });
};
