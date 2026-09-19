import {
  getGetPublicSettingsQueryOptions,
  getGetSettingsQueryOptions,
  useGetPublicSettings,
  useGetSettings,
  useGetSettingsSuspense,
} from "@/api/generated";
import type { FeatureFlags, SettingsResponse } from "@/api/generated/model";
import { parseIso, todayInZone } from "@/lib/calendar";

export type FeatureKey = keyof FeatureFlags;

const settingsQuery = { staleTime: 5 * 60 * 1000, retry: false } as const;
const quietSettingsQuery = {
  ...settingsQuery,
  throwOnError: false,
  meta: { silent: true },
} as const;

export function settingsQueryOptions() {
  return getGetSettingsQueryOptions({ query: settingsQuery });
}

export function publicSettingsQueryOptions() {
  return getGetPublicSettingsQueryOptions({ query: settingsQuery });
}

const defaultSettings: SettingsResponse = {
  instanceName: null,
  features: {
    budgets: true,
    goals: true,
    recurringBills: true,
    netWorth: true,
    reports: true,
    import: true,
    households: true,
    multiCurrency: true,
    investments: true,
  },
  reportingCurrency: "eur",
  enabledCurrencies: ["eur"],
  exchangeRateSyncEnabled: true,
  ratesAsOf: null,
  defaultLanguage: "en",
  timeZone: "UTC",
  firstDayOfWeek: "monday",
  defaultAccountId: null,
  defaultPageSize: 20,
};

interface SettingsOptions {
  enabled?: boolean;
}

export function useSettings({ enabled = true }: Readonly<SettingsOptions> = {}): SettingsResponse {
  const settings = useGetSettings({ query: { ...quietSettingsQuery, enabled } });

  return settings.data ?? defaultSettings;
}

export function useSettingsSuspense(): SettingsResponse {
  return useGetSettingsSuspense({ query: settingsQuery }).data;
}

export function usePublicSettings() {
  return useGetPublicSettings({ query: quietSettingsQuery }).data;
}

export function useFeature(feature: FeatureKey): boolean {
  return useSettings().features[feature];
}

export function useWeekStartsOn(): 0 | 1 {
  return useSettings().firstDayOfWeek === "sunday" ? 0 : 1;
}

export function useToday(): string {
  return todayInZone(useSettings().timeZone);
}

export function useTodayDate(): Date {
  return parseIso(useToday()) ?? new Date();
}
