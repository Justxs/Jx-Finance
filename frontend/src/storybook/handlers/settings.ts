import {
  getPublicSettingsMockHandler,
  getSettingsMockHandler,
  getSyncExchangeRatesMockHandler,
  getUpdateSettingsMockHandler,
} from "@/api/generated/settings/settings.msw";
import { FIXTURE_TODAY, settings } from "@/storybook/fixtures";
import { readBody } from "./http";

export const settingsHandlers = [
  getPublicSettingsMockHandler({
    instanceName: settings.instanceName,
    defaultLanguage: settings.defaultLanguage,
  }),
  getSettingsMockHandler(settings),
  getUpdateSettingsMockHandler(async ({ request }) => ({
    ...settings,
    ...(await readBody(request)),
  })),
  getSyncExchangeRatesMockHandler({ added: 62, ratesAsOf: FIXTURE_TODAY }),
];
