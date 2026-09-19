import { enUS, lt } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useCurrencies } from "@/api/generated";
import { Currency } from "@/api/generated/model";
import { useSettings } from "@/hooks/use-settings";
import { parseIso, safeTimeZone } from "@/lib/calendar";

const currenciesQuery = {
  staleTime: 5 * 60 * 1000,
  retry: false,
  throwOnError: false,
  meta: { silent: true },
} as const;
const allCurrencies = Object.values(Currency);

export function useReportingCurrency(): Currency {
  const currencies = useCurrencies({ query: currenciesQuery });

  return currencies.data?.reportingCurrency ?? "eur";
}

export function useUsableCurrencies(): readonly Currency[] {
  const currencies = useCurrencies({ query: currenciesQuery });

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

export function useDateTime() {
  const { i18n } = useTranslation();
  const timeZone = safeTimeZone(useSettings().timeZone);
  const dateTime = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });

  return function formatDateTime(value?: string | null) {
    const parsed = value ? new Date(value) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? dateTime.format(parsed) : "";
  };
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

const decimalFormatters = new Map<string, Intl.NumberFormat>();

function decimalFormatter(language: string, minimum: number, maximum: number, currency?: string) {
  const code = currency?.toUpperCase();
  const key = `${language}|${minimum}|${maximum}|${code ?? ""}`;
  const cached = decimalFormatters.get(key);
  if (cached) {
    return cached;
  }

  const created = new Intl.NumberFormat(language, {
    ...(code ? { style: "currency", currency: code, currencyDisplay: "symbol" } : {}),
    minimumFractionDigits: minimum,
    maximumFractionDigits: maximum,
  });
  decimalFormatters.set(key, created);
  return created;
}

export function useRateFormat() {
  const { i18n } = useTranslation();

  return decimalFormatter(i18n.language, 4, 4);
}

export function useQuantityFormat() {
  const { i18n } = useTranslation();

  return decimalFormatter(i18n.language, 0, 8);
}

export function usePriceFormat() {
  const { i18n } = useTranslation();

  return function formatPrice(value: number, currency: string) {
    return decimalFormatter(i18n.language, 2, 4, currency).format(value);
  };
}

export function useSignedPercent() {
  const { i18n } = useTranslation();
  const percent = new Intl.NumberFormat(i18n.language, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return function formatSignedPercent(value: number) {
    if (value === 0) {
      return percent.format(0);
    }

    return (value < 0 ? "−" : "+") + percent.format(Math.abs(value) / 100);
  };
}

export function useRatePercent() {
  const { i18n } = useTranslation();
  const percent = new Intl.NumberFormat(i18n.language, {
    style: "percent",
    maximumFractionDigits: 2,
  });

  return function formatRatePercent(value: number) {
    return percent.format(value / 100);
  };
}

export const EMPTY_VALUE = "—";

export function usePercent() {
  const { i18n } = useTranslation();

  return new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
}

export function useMonthLabel() {
  const { i18n } = useTranslation();
  const month = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" });

  return function monthLabel(date: Date) {
    return month.format(date);
  };
}
