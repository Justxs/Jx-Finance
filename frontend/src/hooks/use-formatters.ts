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

export function signed(
  value: number,
  format: (magnitude: number) => string,
  sign: MoneySign = "auto",
) {
  const magnitude = format(Math.abs(value));
  if (value === 0) {
    return magnitude;
  }
  if (sign !== "auto") {
    return sign + magnitude;
  }
  return (value < 0 ? "−" : "+") + magnitude;
}

export function useNumberFormat(options: Intl.NumberFormatOptions = {}) {
  const { i18n } = useTranslation();

  return numberFormat(i18n.language, options);
}

export function useDateFormat(options: Intl.DateTimeFormatOptions) {
  const { i18n } = useTranslation();

  return dateFormat(i18n.language, options);
}

function isoFormatter(format: Intl.DateTimeFormat) {
  return function formatIso(value?: string | null) {
    const parsed = value ? parseIso(value) : null;
    return parsed ? format.format(parsed) : "";
  };
}

const shortDay: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

function useCurrencyFormat(compact: boolean) {
  const { i18n } = useTranslation();
  const reportingCurrency = useReportingCurrency();

  function format(value: number, currency: string = reportingCurrency) {
    return currencyFormatter(i18n.language, currency, compact).format(value);
  }

  function formatSigned(value: number, sign: MoneySign = "auto", currency?: string) {
    return signed(value, (magnitude) => format(magnitude, currency), sign);
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
  return useDateFormat({ dateStyle: "medium" });
}

export function useDateTime() {
  const timeZone = safeTimeZone(useSettings().timeZone);
  const dateTime = useDateFormat({ dateStyle: "medium", timeStyle: "short", timeZone });

  return function formatDateTime(value?: string | null) {
    const parsed = value ? new Date(value) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? dateTime.format(parsed) : "";
  };
}

export function useIsoDate() {
  return isoFormatter(useDate());
}

export function useShortDayIso() {
  return isoFormatter(useDateFormat(shortDay));
}

export function useCalendarLocale() {
  const { i18n } = useTranslation();

  return i18n.language.startsWith("lt") ? lt : enUS;
}

export function useRateFormat() {
  return useNumberFormat({ minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export function useQuantityFormat() {
  return useNumberFormat({ minimumFractionDigits: 0, maximumFractionDigits: 8 });
}

export function usePriceFormat() {
  const { i18n } = useTranslation();

  return function formatPrice(value: number, currency: string) {
    return numberFormat(i18n.language, {
      ...currencyOptions(currency),
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };
}

export function useRatePercent() {
  const percent = useNumberFormat({ style: "percent", maximumFractionDigits: 2 });

  return function formatRatePercent(value: number) {
    return percent.format(value / 100);
  };
}

export const EMPTY_VALUE = "—";

export function usePercent() {
  return useNumberFormat({ style: "percent", maximumFractionDigits: 0 });
}

export function useShortMonth() {
  return useDateFormat({ month: "short", year: "numeric" });
}

export function useAxisDateTick(shortSpan: boolean) {
  const formatIso = isoFormatter(
    useDateFormat(shortSpan ? shortDay : { month: "short", year: "2-digit" }),
  );

  return function formatTick(value: string) {
    return formatIso(value) || value;
  };
}

export function useBytes() {
  const { t } = useTranslation();
  const number = useNumberFormat({ maximumFractionDigits: 1 });

  return function formatBytes(bytes: number) {
    const { value, unit } = splitBytes(bytes);
    return t(`backup.bytes.${unit}`, { value: number.format(value) });
  };
}
