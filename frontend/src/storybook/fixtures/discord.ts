import type { DiscordSettingsResponse } from "@/api/generated/model";
import { problemOf } from "./problems";

const validationType = "https://tools.ietf.org/html/rfc9110#section-15.5.1";

export const discordSettings: DiscordSettingsResponse = {
  enabled: true,
  hasWebhook: true,
  lastDeliveredAt: "2026-09-25T07:14:00Z",
  lastError: null,
  disabledByDiscord: false,
  unreadable: false,
};

export const discordSettingsEmpty: DiscordSettingsResponse = {
  enabled: false,
  hasWebhook: false,
  lastDeliveredAt: null,
  lastError: null,
  disabledByDiscord: false,
  unreadable: false,
};

export const discordSettingsGone: DiscordSettingsResponse = {
  ...discordSettings,
  lastError: "Discord says this webhook no longer exists. Create a new one and paste its URL.",
  disabledByDiscord: true,
};

export const discordSettingsUnreadable: DiscordSettingsResponse = {
  ...discordSettings,
  lastDeliveredAt: null,
  unreadable: true,
};

export const discordSettingsFailing: DiscordSettingsResponse = {
  ...discordSettings,
  lastError: "Discord answered 503. Try again later.",
};

export const discordWebhookGoneProblem = problemOf(
  400,
  "discord.webhookGone",
  "Discord says this webhook no longer exists. Create a new one and paste its URL.",
  { type: validationType },
);
