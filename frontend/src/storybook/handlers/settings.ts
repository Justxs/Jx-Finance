import {
  getDeleteExchangeRateMockHandler,
  getExchangeRateEntriesMockHandler,
  getMarketPriceSettingsMockHandler,
  getPublicSettingsMockHandler,
  getSendTestEmailMockHandler,
  getSetExchangeRateMockHandler,
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
  exchangeRateEntries,
  FIXTURE_TODAY,
  marketPriceSettings,
  marketPriceSync,
  publicSettings,
  settings,
  smtpSettings,
  smtpTestSent,
} from "@/storybook/fixtures";
import { currencyCode, readBody, text } from "./http";

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
  getExchangeRateEntriesMockHandler(exchangeRateEntries),
  getSetExchangeRateMockHandler(async ({ request, params }) => ({
    date: String(params.date),
    currency: currencyCode.parse(params.currency),
    rate: text((await readBody(request)).rate) ?? "",
    source: "manual",
    syncedRate: null,
  })),
  getDeleteExchangeRateMockHandler(),
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
