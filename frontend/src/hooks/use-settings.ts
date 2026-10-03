import {
  usePublicSettings as usePublicSettingsQuery,
  useSettings as useSettingsQuery,
  useSettingsSuspense as useSettingsSuspenseQuery,
} from "@/api/generated";
import type { SettingsResponse } from "@/api/generated/model";
import { todayInZone } from "@/lib/calendar";
import { silentQuery } from "@/lib/query-client";
import { todayDateIn } from "@/lib/route-prefetch";
import { type FeatureKey, defaultSettings, settingsQuery } from "@/lib/settings";

const quietSettingsQuery = { ...settingsQuery, ...silentQuery } as const;

interface SettingsOptions {
  enabled?: boolean;
}

export function useSettings({ enabled = true }: Readonly<SettingsOptions> = {}): SettingsResponse {
  const settings = useSettingsQuery({ query: { ...quietSettingsQuery, enabled } });

  return settings.data ?? defaultSettings;
}

export function useSettingsSuspense(): SettingsResponse {
  return useSettingsSuspenseQuery({ query: settingsQuery }).data;
}

export function usePublicSettings() {
  return usePublicSettingsQuery({ query: quietSettingsQuery }).data;
}

export function useEmailEnabled(): boolean {
  return usePublicSettings()?.emailEnabled ?? false;
}

export function useDiscordEnabled(): boolean {
  return usePublicSettings()?.discordEnabled ?? false;
}

export function useTelegramEnabled(): boolean {
  return usePublicSettings()?.telegramEnabled ?? false;
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
  return todayDateIn(useSettings());
}

export function usePasskeysAvailable(): boolean {
  return usePublicSettings()?.passkeysAvailable ?? false;
}
