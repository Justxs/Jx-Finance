import type {
  ExchangeRateEntryResponse,
  FeatureFlags,
  PublicSettingsResponse,
  SettingsResponse,
} from "@/api/generated/model";
import { FIXTURE_TODAY } from "./base";
import { problemOf } from "./problems";

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
    unusualAmounts: true,
    monthClose: true,
    receiptReading: true,
    apiTokens: true,
    locations: false,
    learnedCategories: false,
    attachments: true,
    payeeNames: true,
    people: true,
    cashFlowForecast: true,
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
  supportLinkEnabled: true,
  receiptReadingReady: false,
  setupPending: false,
  demoData: false,
};

export const publicSettings: PublicSettingsResponse = {
  instanceName: settings.instanceName,
  defaultLanguage: settings.defaultLanguage,
  emailEnabled: false,
  discordEnabled: true,
  telegramEnabled: false,
  passkeysAvailable: true,
};

export interface SettingsPatch extends Partial<Omit<SettingsResponse, "features">> {
  features?: Partial<FeatureFlags>;
}

export function settingsWith({ features, ...patch }: SettingsPatch = {}): SettingsResponse {
  return { ...settings, ...patch, features: { ...settings.features, ...features } };
}

export const exchangeRateEntries: ExchangeRateEntryResponse[] = [
  { date: FIXTURE_TODAY, currency: "usd", rate: "1.0842", source: "ecb", syncedRate: null },
  { date: "2026-09-17", currency: "usd", rate: "1.09", source: "manual", syncedRate: "1.0831" },
  { date: "2026-09-16", currency: "usd", rate: "1.0815", source: "ecb", syncedRate: null },
  { date: "2026-09-13", currency: "usd", rate: "1.0799", source: "manual", syncedRate: null },
];

export const exchangeRateFutureDateProblem = problemOf(
  400,
  "exchangeRate.futureDate",
  "A rate cannot be dated after today.",
  { name: "date" },
);
