import { type DiscordWebhookResponse, NotificationType } from "@/api/generated/model";
import { problemOf } from "./problems";

const validationType = "https://tools.ietf.org/html/rfc9110#section-15.5.1";

export const myDiscord: DiscordWebhookResponse = {
  hasWebhook: true,
  isEnabled: true,
  types: ["billDue", "budgetExceeded"],
  lastDeliveredAt: "2026-09-25T07:14:00Z",
  lastError: null,
  disabledByDiscord: false,
  unreadable: false,
};

export const myDiscordEmpty: DiscordWebhookResponse = {
  hasWebhook: false,
  isEnabled: true,
  types: Object.values(NotificationType),
  lastDeliveredAt: null,
  lastError: null,
  disabledByDiscord: false,
  unreadable: false,
};

export const myDiscordGone: DiscordWebhookResponse = {
  ...myDiscord,
  lastError: "Discord says this webhook no longer exists. Create a new one and paste its URL.",
  disabledByDiscord: true,
};

export const myDiscordUnreadable: DiscordWebhookResponse = {
  ...myDiscord,
  lastDeliveredAt: null,
  unreadable: true,
};

export const myDiscordFailing: DiscordWebhookResponse = {
  ...myDiscord,
  lastError: "Discord answered 503. Try again later.",
};

export const discordWebhookGoneProblem = problemOf(
  400,
  "discord.webhookGone",
  "Discord says this webhook no longer exists. Create a new one and paste its URL.",
  { type: validationType },
);
