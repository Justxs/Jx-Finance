import { enUS, lt } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useGetCurrenciesEndpoint } from "@/api/generated";
import { Currency } from "@/api/generated/model";
import { parseIso } from "@/lib/calendar";

const currenciesQuery = { staleTime: 5 * 60 * 1000, retry: false, throwOnError: false } as const;
const allCurrencies = Object.values(Currency);

export function useReportingCurrency(): Currency {
  const currencies = useGetCurrenciesEndpoint({ query: currenciesQuery });

  return currencies.data?.reportingCurrency ?? "eur";
}

export function useUsableCurrencies(): readonly Currency[] {
  const currencies = useGetCurrenciesEndpoint({ query: currenciesQuery });

  return currencies.data?.currencies ?? allCurrencies;
}

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function currencyFormatter(language: string, currency: string, compact: boolean) {
  const code = currency.toUpperCase();
  const key = `${language}|${code}|${compact}`;
  const cached = currencyFormatters.get(key);
  if (cached) {
    return cached;
  }

  const created = new Intl.NumberFormat(language, {
    style: "currency",
    currency: code,
    currencyDisplay: "symbol",
    ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
  });
  currencyFormatters.set(key, created);
  return created;
}

export type MoneySign = "+" | "−" | "auto";

function useCurrencyFormat(compact: boolean) {
  const { i18n } = useTranslation();
  const reportingCurrency = useReportingCurrency();

  function format(value: number, currency: string = reportingCurrency) {
    return currencyFormatter(i18n.language, currency, compact).format(value);
  }

  function formatSigned(value: number, sign: MoneySign = "auto", currency?: string) {
    if (value === 0) {
      return format(value, currency);
    }

    const autoSign = value < 0 ? "−" : "+";
    return (sign === "auto" ? autoSign : sign) + format(Math.abs(value), currency);
  }

  return { format, formatSigned };
}

export function useMoney() {
  return useCurrencyFormat(false);
}

export function useAxisMoney() {
  return useCurrencyFormat(true);
}

export function useCurrencyName() {
  const { i18n } = useTranslation();
  const names = new Intl.DisplayNames(i18n.language, { type: "currency" });

  return function currencyName(currency: string) {
    return names.of(currency.toUpperCase()) ?? currency.toUpperCase();
  };
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

export function useCalendarLocale() {
  const { i18n } = useTranslation();

  return i18n.language.startsWith("lt") ? lt : enUS;
}

const rateFormatters = new Map<string, Intl.NumberFormat>();

function rateFormatter(language: string) {
  const cached = rateFormatters.get(language);
  if (cached) {
    return cached;
  }

  const created = new Intl.NumberFormat(language, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  rateFormatters.set(language, created);
  return created;
}

export function useRateFormat() {
  const { i18n } = useTranslation();

  return rateFormatter(i18n.language);
}

export const EMPTY_VALUE = "—";

export function usePercent() {
  const { i18n } = useTranslation();

  return new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
}

export function useMonthLabel() {
  const { i18n } = useTranslation();
  const month = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" });

  return function monthLabel(date: Date = new Date()) {
    return month.format(date);
  };
}
