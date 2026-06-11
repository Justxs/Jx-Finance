import { useTranslation } from "react-i18next";

export function useMoney() {
  const { i18n } = useTranslation();

  return new Intl.NumberFormat(i18n.language, {
    style: "currency",
    currency: "EUR",
    currencyDisplay: "symbol",
  });
}

export function useDate() {
  const { i18n } = useTranslation();

  return new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
  });
}
