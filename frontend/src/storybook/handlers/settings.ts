import {
  getPublicSettingsMockHandler,
  getReceiptSettingsMockHandler,
  getSendTestEmailMockHandler,
  getSettingsMockHandler,
  getSmtpSettingsMockHandler,
  getSyncExchangeRatesMockHandler,
  getTestReceiptKeyMockHandler,
  getUpdateDiscordSettingsMockHandler,
  getUpdateReceiptSettingsMockHandler,
  getUpdateSettingsMockHandler,
  getUpdateSmtpSettingsMockHandler,
} from "@/api/generated/settings/settings.msw";
import {
  FIXTURE_TODAY,
  publicSettings,
  receiptSettings,
  settings,
  smtpSettings,
  smtpTestSent,
} from "@/storybook/fixtures";
import { readBody, text } from "./http";

export const emailEnabledHandler = getPublicSettingsMockHandler({
  ...publicSettings,
  emailEnabled: true,
});

export const discordOffHandler = getPublicSettingsMockHandler({
  ...publicSettings,
  discordEnabled: false,
});

export const settingsHandlers = [
  getPublicSettingsMockHandler(publicSettings),
  getSettingsMockHandler(settings),
  getUpdateSettingsMockHandler(async ({ request }) => ({
    ...settings,
    ...(await readBody(request)),
  })),
  getSyncExchangeRatesMockHandler({ added: 62, ratesAsOf: FIXTURE_TODAY }),
  getSmtpSettingsMockHandler(smtpSettings),
  getUpdateSmtpSettingsMockHandler(async ({ request }) => {
    const body = await readBody(request);
    return { ...smtpSettings, ...body, hasPassword: Boolean(text(body.userName)) };
  }),
  getSendTestEmailMockHandler(smtpTestSent),
  getUpdateDiscordSettingsMockHandler(),
  getReceiptSettingsMockHandler(receiptSettings),
  getUpdateReceiptSettingsMockHandler(async ({ request }) => {
    const body = await readBody(request);
    return {
      ...receiptSettings,
      ...body,
      hasKey: receiptSettings.hasKey || Boolean(text(body.apiKey)),
    };
  }),
  getTestReceiptKeyMockHandler(),
];
