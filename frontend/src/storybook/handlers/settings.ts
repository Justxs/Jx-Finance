import {
  getPublicSettingsMockHandler,
  getSendTestEmailMockHandler,
  getSettingsMockHandler,
  getSmtpSettingsMockHandler,
  getSyncExchangeRatesMockHandler,
  getUpdateSettingsMockHandler,
  getUpdateSmtpSettingsMockHandler,
} from "@/api/generated/settings/settings.msw";
import {
  FIXTURE_TODAY,
  publicSettings,
  settings,
  smtpSettings,
  smtpTestSent,
} from "@/storybook/fixtures";
import { readBody, text } from "./http";

export const emailEnabledHandler = getPublicSettingsMockHandler({
  ...publicSettings,
  emailEnabled: true,
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
];
