import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createQueryWrapper } from "@/test/query";
import { settingsFixture } from "@/test/settings";
import {
  publicSettingsQueryOptions,
  settingsQueryOptions,
  useFeature,
  useSettings,
  useToday,
  useTodayDate,
  useWeekStartsOn,
} from "./use-settings";

afterEach(() => {
  vi.useRealTimers();
});

describe("useSettings", () => {
  test("serves permissive defaults until settings load", () => {
    const { Wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useSettings(), { wrapper: Wrapper });

    expect(result.current.timeZone).toBe("UTC");
    expect(Object.values(result.current.features).every(Boolean)).toBe(true);
  });

  test("returns loaded settings", () => {
    const settings = settingsFixture();
    const { Wrapper } = createQueryWrapper({ settings });

    const { result } = renderHook(() => useSettings(), { wrapper: Wrapper });

    expect(result.current).toEqual(settings);
  });

  test("a disabled query does not fetch", () => {
    const { Wrapper } = createQueryWrapper();

    renderHook(() => useSettings({ enabled: false }), { wrapper: Wrapper });

    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("derived settings", () => {
  test("useFeature reads one flag", () => {
    const { Wrapper } = createQueryWrapper({ settings: settingsFixture() });

    expect(renderHook(() => useFeature("budgets"), { wrapper: Wrapper }).result.current).toBe(true);
    expect(renderHook(() => useFeature("goals"), { wrapper: Wrapper }).result.current).toBe(false);
  });

  test.each([
    ["monday", 1],
    ["sunday", 0],
  ] as const)("a week starting on %s is day %i", (firstDayOfWeek, expected) => {
    const { Wrapper } = createQueryWrapper({ settings: settingsFixture({ firstDayOfWeek }) });

    expect(renderHook(() => useWeekStartsOn(), { wrapper: Wrapper }).result.current).toBe(expected);
  });

  test("today follows the instance time zone", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-06T22:30:00Z"));
    const { Wrapper } = createQueryWrapper({ settings: settingsFixture() });

    expect(renderHook(() => useToday(), { wrapper: Wrapper }).result.current).toBe("2026-09-07");
    expect(renderHook(() => useTodayDate(), { wrapper: Wrapper }).result.current).toEqual(
      new Date(2026, 8, 7),
    );
  });
});

describe("query options", () => {
  test("settings stay fresh for five minutes without retries", () => {
    for (const options of [settingsQueryOptions(), publicSettingsQueryOptions()]) {
      expect(options).toMatchObject({ staleTime: 300_000, retry: false });
    }
    expect(settingsQueryOptions().queryKey).not.toEqual(publicSettingsQueryOptions().queryKey);
  });
});
