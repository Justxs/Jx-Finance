import { useTranslation } from "react-i18next";
import { parseIso } from "@/lib/calendar";

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

export function useIsoDate() {
  const date = useDate();

  return function formatIsoDate(value?: string | null) {
    const parsed = value ? parseIso(value) : null;
    return parsed ? date.format(parsed) : "";
  };
}
