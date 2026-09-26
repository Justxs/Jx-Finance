import type { FeatureFlags, PublicSettingsResponse, SettingsResponse } from "@/api/generated/model";

export const settings: SettingsResponse = {
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
  },
  reportingCurrency: "eur",
  enabledCurrencies: ["eur", "usd", "gbp", "pln", "chf", "sek", "nok"],
  exchangeRateSyncEnabled: true,
  ratesAsOf: "2026-09-18",
  defaultLanguage: "en",
  timeZone: "Europe/Vilnius",
  firstDayOfWeek: "monday",
  defaultAccountId: null,
  defaultPageSize: 20,
};

export const publicSettings: PublicSettingsResponse = {
  instanceName: settings.instanceName,
  defaultLanguage: settings.defaultLanguage,
  emailEnabled: false,
};

export interface SettingsPatch extends Partial<Omit<SettingsResponse, "features">> {
  features?: Partial<FeatureFlags>;
}

export function settingsWith({ features, ...patch }: SettingsPatch = {}): SettingsResponse {
  return { ...settings, ...patch, features: { ...settings.features, ...features } };
}
