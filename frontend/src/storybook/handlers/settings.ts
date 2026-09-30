import {
  getMarketPriceSettingsMockHandler,
  getPublicSettingsMockHandler,
  getSendTestEmailMockHandler,
  getSettingsMockHandler,
  getSmtpSettingsMockHandler,
  getSyncExchangeRatesMockHandler,
  getSyncMarketPricesMockHandler,
  getUpdateDiscordSettingsMockHandler,
  getUpdateMarketPriceSettingsMockHandler,
  getUpdateSettingsMockHandler,
  getUpdateSmtpSettingsMockHandler,
} from "@/api/generated/settings/settings.msw";
import {
  FIXTURE_TODAY,
  marketPriceSettings,
  marketPriceSync,
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

export const discordOffHandler = getPublicSettingsMockHandler({
  ...publicSettings,
  discordEnabled: false,
});

export const passkeysOffHandler = getPublicSettingsMockHandler({
  ...publicSettings,
  passkeysAvailable: false,
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
  getMarketPriceSettingsMockHandler(marketPriceSettings),
  getUpdateMarketPriceSettingsMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const key = body.eodhdApiKey;
    return {
      ...marketPriceSettings,
      enabled: body.enabled === true,
      hasKey: typeof key === "string" ? key.length > 0 : marketPriceSettings.hasKey,
    };
  }),
  getSyncMarketPricesMockHandler(marketPriceSync),
];
