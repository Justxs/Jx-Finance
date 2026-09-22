import type { SettingsResponse } from "@/api/generated/model";
import { settings } from "@/storybook/fixtures/settings";

export function settingsFixture(overrides: Partial<SettingsResponse> = {}): SettingsResponse {
  return {
    ...settings,
    instanceName: "Home",
    features: { ...settings.features, goals: false, households: false },
    enabledCurrencies: ["eur", "usd"],
    ratesAsOf: null,
    ...overrides,
  };
}
