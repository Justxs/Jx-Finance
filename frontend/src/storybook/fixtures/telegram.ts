import type { TelegramSettingsResponse } from "@/api/generated/model";
import { problemOf } from "./problems";

const validationType = "https://tools.ietf.org/html/rfc9110#section-15.5.1";

export const telegramSettings: TelegramSettingsResponse = {
  enabled: true,
  hasToken: true,
  chatId: -1001234567890,
  lastDeliveredAt: "2026-09-25T07:14:00Z",
  lastError: null,
  disabledByTelegram: false,
  unreadable: false,
};

export const telegramSettingsEmpty: TelegramSettingsResponse = {
  enabled: false,
  hasToken: false,
  chatId: null,
  lastDeliveredAt: null,
  lastError: null,
  disabledByTelegram: false,
  unreadable: false,
};

export const telegramSettingsRemoved: TelegramSettingsResponse = {
  ...telegramSettings,
  lastError: "Telegram says the bot was removed from the group or its token was revoked.",
  disabledByTelegram: true,
};

export const telegramSettingsUnreadable: TelegramSettingsResponse = {
  ...telegramSettings,
  lastDeliveredAt: null,
  unreadable: true,
};

export const telegramSettingsFailing: TelegramSettingsResponse = {
  ...telegramSettings,
  lastError: "Telegram answered 502. Try again later.",
};

export const telegramBotRemovedProblem = problemOf(
  400,
  "telegram.botRemoved",
  "Telegram says the bot was removed from the group or its token was revoked.",
  { type: validationType },
);
