import { enUS, lt } from "react-day-picker/locale";
import { useTranslation } from "react-i18next";
import { useReportingCurrency } from "@/hooks/use-currencies";
import { useSettings } from "@/hooks/use-settings";
import { splitBytes } from "@/lib/bytes";
import { parseIso, safeTimeZone } from "@/lib/calendar";
import { maskParts } from "@/lib/mask-amount";
import { useAmountsHidden } from "@/stores/privacy-store";

const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();
const relativeFormats = new Map<string, Intl.RelativeTimeFormat>();
const displayNames = new Map<string, Intl.DisplayNames>();

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

function formatAmount(formatter: Intl.NumberFormat, value: number, hidden: boolean) {
  return hidden ? maskParts(formatter.formatToParts(value)) : formatter.format(value);
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

export function useDecimalMark() {
  return (
    useNumberFormat()
      .formatToParts(0.5)
      .find((part) => part.type === "decimal")?.value ?? "."
  );
}

export function useMaskedNumber(options: Intl.NumberFormatOptions = {}) {
  const number = useNumberFormat(options);
  const hidden = useAmountsHidden();

  function format(value: number) {
    return formatAmount(number, value, hidden);
  }

  return { format };
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
  const hidden = useAmountsHidden();

  function format(value: number, currency: string = reportingCurrency) {
    return formatAmount(currencyFormatter(i18n.language, currency, compact), value, hidden);
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
  const names = cached(
    displayNames,
    i18n.language,
    { type: "currency" },
    () => new Intl.DisplayNames(i18n.language, { type: "currency" }),
  );

  return function currencyName(currency: string) {
    return names.of(currency.toUpperCase()) ?? currency.toUpperCase();
  };
}

export function useRelativeDays() {
  const { i18n } = useTranslation();
  const format = cached(
    relativeFormats,
    i18n.language,
    { numeric: "auto" },
    () => new Intl.RelativeTimeFormat(i18n.language, { numeric: "auto" }),
  );

  return function formatRelativeDays(days: number) {
    return format.format(days, "day");
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
  return useMaskedNumber({ minimumFractionDigits: 0, maximumFractionDigits: 8 });
}

export function usePriceFormat() {
  const { i18n } = useTranslation();
  const hidden = useAmountsHidden();

  return function formatPrice(value: number, currency: string) {
    const formatter = numberFormat(i18n.language, {
      ...currencyOptions(currency),
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
    return formatAmount(formatter, value, hidden);
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

export function useMonthName() {
  const format = useDateFormat({ month: "long", year: "numeric" });

  return function formatMonth(isoDateOrMonth: string) {
    const parsed = parseIso(isoDateOrMonth.length === 7 ? `${isoDateOrMonth}-01` : isoDateOrMonth);
    return parsed ? format.format(parsed) : isoDateOrMonth;
  };
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
