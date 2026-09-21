import type { SettingsResponse } from "@/api/generated/model";

export function settingsFixture(overrides: Partial<SettingsResponse> = {}): SettingsResponse {
  return {
    instanceName: "Home",
    features: {
      budgets: true,
      goals: false,
      recurringBills: true,
      netWorth: true,
      reports: true,
      import: true,
      households: false,
      multiCurrency: true,
      investments: true,
      categorizationRules: true,
    },
    reportingCurrency: "eur",
    enabledCurrencies: ["eur", "usd"],
    exchangeRateSyncEnabled: true,
    ratesAsOf: null,
    defaultLanguage: "en",
    timeZone: "Europe/Vilnius",
    firstDayOfWeek: "monday",
    defaultAccountId: null,
    defaultPageSize: 20,
    ...overrides,
  };
}
