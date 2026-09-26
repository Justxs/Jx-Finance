import { renderHook } from "@testing-library/react";
import { enUS, lt } from "react-day-picker/locale";
import { afterEach, describe, expect, test } from "vitest";
import { type CurrenciesResponse, Currency } from "@/api/generated/model";
import { i18n } from "@/lib/i18n";
import { createQueryWrapper, plain } from "@/test/query";
import { settingsFixture } from "@/test/settings";
import {
  useAxisDateTick,
  useAxisMoney,
  useCalendarLocale,
  useCurrencyName,
  useDate,
  useDateTime,
  useIsoDate,
  signed,
  useDateFormat,
  useMoney,
  useNumberFormat,
  usePercent,
  usePriceFormat,
  useQuantityFormat,
  useRatePercent,
  useReportingCurrency,
  useShortDayIso,
  useShortMonth,
  useUsableCurrencies,
} from "./use-formatters";

function fixed(magnitude: number) {
  return magnitude.toFixed(2);
}

function hook<T>(
  callback: () => T,
  seed: Parameters<typeof createQueryWrapper>[0] = {
    currencies: { reportingCurrency: "eur", currencies: ["eur", "usd"], ratesAsOf: null },
  },
) {
  return renderHook(callback, { wrapper: createQueryWrapper(seed).Wrapper }).result.current;
}

afterEach(async () => {
  await i18n.changeLanguage("en");
});

describe("currencies", () => {
  test("fall back to euro and every currency until loaded", () => {
    expect(hook(() => useReportingCurrency(), {})).toBe("eur");
    expect(hook(() => useUsableCurrencies(), {})).toEqual(Object.values(Currency));
  });

  test("come from the API once loaded", () => {
    const currencies: CurrenciesResponse = {
      reportingCurrency: "usd",
      currencies: ["usd", "eur"],
      ratesAsOf: null,
    };

    expect(hook(() => useReportingCurrency(), { currencies })).toBe("usd");
    expect(hook(() => useUsableCurrencies(), { currencies })).toEqual(["usd", "eur"]);
  });
});

describe("useMoney", () => {
  test("formats in the reporting currency by default", () => {
    expect(hook(() => useMoney()).format(1234.5)).toBe("€1,234.50");
  });

  test("formats another currency on request", () => {
    expect(hook(() => useMoney()).format(10, "usd")).toBe("$10.00");
  });

  test("follows the language", async () => {
    await i18n.changeLanguage("lt");

    expect(plain(hook(() => useMoney()).format(1234.5))).toBe("1 234,50 €");
  });

  test("signs amounts with a real minus and leaves zero bare", () => {
    const money = hook(() => useMoney());

    expect(money.formatSigned(12)).toBe("+€12.00");
    expect(money.formatSigned(-12)).toBe("−€12.00");
    expect(money.formatSigned(0)).toBe("€0.00");
  });

  test("a forced sign overrides the value and applies to the magnitude", () => {
    const money = hook(() => useMoney());

    expect(money.formatSigned(12, "−")).toBe("−€12.00");
    expect(money.formatSigned(-12, "+", "usd")).toBe("+$12.00");
  });
});

describe("useAxisMoney", () => {
  test("compacts large values", () => {
    const axis = hook(() => useAxisMoney());

    expect(axis.format(1500)).toBe("€1.5K");
    expect(axis.format(2_000_000)).toBe("€2M");
  });
});

describe("useCurrencyName", () => {
  test("names currencies in the language", async () => {
    expect(hook(() => useCurrencyName())("usd")).toBe("US Dollar");

    await i18n.changeLanguage("lt");
    expect(hook(() => useCurrencyName())("eur")).toBe("Euras");
  });
});

describe("dates", () => {
  test("useDate formats medium dates", () => {
    expect(hook(() => useDate()).format(new Date(2026, 8, 6))).toBe("Sep 6, 2026");
  });

  test("useIsoDate reads calendar dates without a zone shift", () => {
    const formatIsoDate = hook(() => useIsoDate());

    expect(formatIsoDate("2026-09-06")).toBe("Sep 6, 2026");
    expect(formatIsoDate("2026-01-01")).toBe("Jan 1, 2026");
  });

  test.each([null, undefined, "", "06/09/2026"])("useIsoDate gives nothing for %j", (value) => {
    expect(hook(() => useIsoDate())(value)).toBe("");
  });

  test("useDateTime shows instants in the instance time zone", () => {
    const formatDateTime = hook(() => useDateTime(), { settings: settingsFixture() });

    expect(plain(formatDateTime("2026-09-06T22:30:00Z"))).toBe("Sep 7, 2026, 1:30 AM");
  });

  test("useDateTime survives an unknown time zone", () => {
    const formatDateTime = hook(() => useDateTime(), {
      settings: settingsFixture({ timeZone: "Not/AZone" }),
    });

    expect(formatDateTime("2026-09-06T22:30:00Z")).not.toBe("");
  });

  test.each([null, undefined, "", "not a date"])("useDateTime gives nothing for %j", (value) => {
    expect(hook(() => useDateTime())(value)).toBe("");
  });

  test("useDateFormat formats with the given options", () => {
    const month = hook(() => useDateFormat({ month: "long", year: "numeric" }));

    expect(month.format(new Date(2026, 8, 6))).toBe("September 2026");
  });

  test("useCalendarLocale follows the language", async () => {
    expect(hook(() => useCalendarLocale())).toBe(enUS);

    await i18n.changeLanguage("lt");
    expect(hook(() => useCalendarLocale())).toBe(lt);
  });
});

describe("numbers", () => {
  test("quantities keep up to eight decimals and no padding", () => {
    const quantity = hook(() => useQuantityFormat());

    expect(quantity.format(1.5)).toBe("1.5");
    expect(quantity.format(0.123456789)).toBe("0.12345679");
    expect(quantity.format(1200)).toBe("1,200");
  });

  test("prices show two to four decimals in their currency", () => {
    const formatPrice = hook(() => usePriceFormat());

    expect(formatPrice(98.4, "eur")).toBe("€98.40");
    expect(formatPrice(0.12345, "usd")).toBe("$0.1235");
  });

  test("signed puts a real minus or a plus before the magnitude and leaves zero bare", () => {
    expect(signed(12.345, fixed)).toBe("+12.35");
    expect(signed(-3, fixed)).toBe("−3.00");
    expect(signed(0, fixed)).toBe("0.00");
    expect(signed(-3, fixed, "+")).toBe("+3.00");
  });

  test("rate percents trim trailing zeros", () => {
    const formatRatePercent = hook(() => useRatePercent());

    expect(formatRatePercent(3.5)).toBe("3.5%");
    expect(formatRatePercent(15)).toBe("15%");
  });

  test("usePercent rounds ratios to whole percents", () => {
    expect(hook(() => usePercent()).format(0.456)).toBe("46%");
  });
});

describe("short formats", () => {
  test("useShortMonth abbreviates the month and keeps the year", () => {
    expect(hook(() => useShortMonth()).format(new Date(2026, 5, 9))).toBe("Jun 2026");
  });

  test("useShortDayIso abbreviates the month and keeps the day", () => {
    expect(hook(() => useShortDayIso())("2026-06-09")).toBe("Jun 9");
    expect(hook(() => useShortDayIso())(null)).toBe("");
  });

  test("useAxisDateTick shows days over a short span and months otherwise", () => {
    expect(hook(() => useAxisDateTick(true))("2026-06-09")).toBe("Jun 9");
    expect(hook(() => useAxisDateTick(false))("2026-06-09")).toBe("Jun 26");
  });

  test("useAxisDateTick leaves unreadable values alone", () => {
    expect(hook(() => useAxisDateTick(true))("soon")).toBe("soon");
  });

  test("useNumberFormat groups digits and caps decimals on request", () => {
    expect(hook(() => useNumberFormat()).format(12345)).toBe("12,345");
    expect(hook(() => useNumberFormat({ maximumFractionDigits: 1 })).format(1.26)).toBe("1.3");
  });
});
