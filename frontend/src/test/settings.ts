import type { SettingsResponse } from "@/api/generated/model";
import { type SettingsPatch, settingsWith } from "@/storybook/fixtures/settings";

export function settingsFixture({ features, ...overrides }: SettingsPatch = {}): SettingsResponse {
  return settingsWith({
    instanceName: "Home",
    enabledCurrencies: ["eur", "usd"],
    ratesAsOf: null,
    ...overrides,
    features: { goals: false, households: false, ...features },
  });
}
