import { getPublicSettingsQueryOptions, getSettingsQueryOptions } from "@/api/generated";
import type { FeatureFlags, SettingsResponse } from "@/api/generated/model";
import { DEFAULT_CURRENCY } from "@/lib/currency";

export type FeatureKey = keyof FeatureFlags;

export const settingsQuery = { staleTime: 5 * 60 * 1000, retry: false } as const;

export function settingsQueryOptions() {
  return getSettingsQueryOptions({ query: settingsQuery });
}

export function publicSettingsQueryOptions() {
  return getPublicSettingsQueryOptions({ query: settingsQuery });
}

export const defaultSettings: SettingsResponse = {
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
    categorizationRules: true,
    unusualAmounts: true,
    monthClose: true,
    receiptReading: true,
    apiTokens: true,
  },
  reportingCurrency: DEFAULT_CURRENCY,
  enabledCurrencies: [DEFAULT_CURRENCY],
  exchangeRateSyncEnabled: true,
  ratesAsOf: null,
  defaultLanguage: "en",
  timeZone: "UTC",
  firstDayOfWeek: "monday",
  defaultAccountId: null,
  defaultPageSize: 20,
  supportLinkEnabled: true,
  receiptReadingReady: false,
};
