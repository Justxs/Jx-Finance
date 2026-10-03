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
  getDiscordSettingsMockHandler,
  getSendTestDiscordMockHandler,
  getUpdateDiscordSettingsMockHandler,
  getSendTestTelegramMockHandler,
  getTelegramSettingsMockHandler,
  getUpdateTelegramSettingsMockHandler,
  getUpdateMarketPriceSettingsMockHandler,
  getUpdateSettingsMockHandler,
  getUpdateSmtpSettingsMockHandler,
} from "@/api/generated/settings/settings.msw";
import {
  discordSettings,
  exchangeRateEntries,
  FIXTURE_TODAY,
  marketPriceSettings,
  marketPriceSync,
  publicSettings,
  settings,
  smtpSettings,
  smtpTestSent,
  telegramSettings,
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

export const telegramEnabledHandler = getPublicSettingsMockHandler({
  ...publicSettings,
  telegramEnabled: true,
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
  getDiscordSettingsMockHandler(discordSettings),
  getUpdateDiscordSettingsMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const replaced = Boolean(text(body.webhookUrl));
    return {
      ...discordSettings,
      enabled: body.enabled === true,
      disabledByDiscord: replaced ? false : discordSettings.disabledByDiscord,
    };
  }),
  getSendTestDiscordMockHandler(),
  getTelegramSettingsMockHandler(telegramSettings),
  getUpdateTelegramSettingsMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const replaced = Boolean(text(body.botToken));
    return {
      ...telegramSettings,
      enabled: body.enabled === true,
      chatId: typeof body.chatId === "number" ? body.chatId : null,
      disabledByTelegram: replaced ? false : telegramSettings.disabledByTelegram,
    };
  }),
  getSendTestTelegramMockHandler(),
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
