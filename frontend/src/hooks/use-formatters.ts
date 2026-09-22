import { enUS, lt } from "react-day-picker/locale";
import { useTranslation } from "react-i18next";
import { useCurrencies } from "@/api/generated";
import type { Currency } from "@/api/generated/model";
import { useSettings } from "@/hooks/use-settings";
import { splitBytes } from "@/lib/bytes";
import { parseIso, safeTimeZone } from "@/lib/calendar";
import { ALL_CURRENCIES, DEFAULT_CURRENCY } from "@/lib/currency";
import { silentQuery } from "@/lib/mutations";

const currenciesQuery = { staleTime: 5 * 60 * 1000, ...silentQuery } as const;

export function useReportingCurrency(): Currency {
  const currencies = useCurrencies({ query: currenciesQuery });

  return currencies.data?.reportingCurrency ?? DEFAULT_CURRENCY;
}

export function useUsableCurrencies(): readonly Currency[] {
  const currencies = useCurrencies({ query: currenciesQuery });

  return currencies.data?.currencies ?? ALL_CURRENCIES;
}

const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function cached<TFormat>(
  cache: Map<string, TFormat>,
  language: string,
  options: object,
  create: () => TFormat,
) {
  const key = `${language}|${JSON.stringify(options)}`;
  const existing = cache.get(key);
  if (existing) {
    return existing;
  }

  const created = create();
  cache.set(key, created);
  return created;
}

function numberFormat(language: string, options: Intl.NumberFormatOptions) {
  return cached(numberFormats, language, options, () => new Intl.NumberFormat(language, options));
}

function dateFormat(language: string, options: Intl.DateTimeFormatOptions) {
  return cached(dateFormats, language, options, () => new Intl.DateTimeFormat(language, options));
}

function currencyOptions(currency: string): Intl.NumberFormatOptions {
  return { style: "currency", currency: currency.toUpperCase(), currencyDisplay: "symbol" };
}

function currencyFormatter(language: string, currency: string, compact: boolean) {
  return numberFormat(language, {
    ...currencyOptions(currency),
    ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
  });
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

  return dateFormat(i18n.language, { dateStyle: "medium" });
}

export function useDateTime() {
  const { i18n } = useTranslation();
  const timeZone = safeTimeZone(useSettings().timeZone);
  const dateTime = dateFormat(i18n.language, { dateStyle: "medium", timeStyle: "short", timeZone });

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

function decimalFormatter(language: string, minimum: number, maximum: number, currency?: string) {
  return numberFormat(language, {
    ...(currency ? currencyOptions(currency) : {}),
    minimumFractionDigits: minimum,
    maximumFractionDigits: maximum,
  });
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
  const percent = numberFormat(i18n.language, {
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
  const percent = numberFormat(i18n.language, { style: "percent", maximumFractionDigits: 2 });

  return function formatRatePercent(value: number) {
    return percent.format(value / 100);
  };
}

export const EMPTY_VALUE = "—";

export function usePercent() {
  const { i18n } = useTranslation();

  return numberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
}

export function useMonthLabel() {
  const { i18n } = useTranslation();
  const month = dateFormat(i18n.language, { month: "long", year: "numeric" });

  return function monthLabel(date: Date) {
    return month.format(date);
  };
}

export function useShortMonth() {
  const { i18n } = useTranslation();

  return dateFormat(i18n.language, { month: "short", year: "numeric" });
}

export function useShortDay() {
  const { i18n } = useTranslation();

  return dateFormat(i18n.language, { month: "short", day: "numeric" });
}

export function useAxisDateTick(shortSpan: boolean) {
  const { i18n } = useTranslation();
  const shortDay = useShortDay();
  const tick = shortSpan
    ? shortDay
    : dateFormat(i18n.language, { month: "short", year: "2-digit" });

  return function formatTick(value: string) {
    const parsed = parseIso(value);
    return parsed ? tick.format(parsed) : value;
  };
}

export function useNumberFormat(maximumFractionDigits?: number) {
  const { i18n } = useTranslation();

  return numberFormat(i18n.language, { maximumFractionDigits });
}

export function useBytes() {
  const { t } = useTranslation();
  const number = useNumberFormat(1);

  return function formatBytes(bytes: number) {
    const { value, unit } = splitBytes(bytes);
    return t(`backup.bytes.${unit}`, { value: number.format(value) });
  };
}
