import {
  getCurrenciesMockHandler,
  getExchangeRateMockHandler,
} from "@/api/generated/currencies/currencies.msw";
import type { Currency } from "@/api/generated/model";
import { FIXTURE_TODAY, currencies, ratesPerEuro } from "@/storybook/fixtures";
import { notFound } from "./http";

export const currencyHandlers = [
  getCurrenciesMockHandler(currencies),
  getExchangeRateMockHandler(({ request }) => {
    const params = new URL(request.url).searchParams;
    const from = ratesPerEuro[params.get("from") as Currency];
    const to = ratesPerEuro[params.get("to") as Currency];
    if (!from || !to) {
      throw notFound();
    }

    return {
      from: params.get("from") as Currency,
      to: params.get("to") as Currency,
      rate: (to / from).toFixed(6),
      asOf: currencies.ratesAsOf ?? FIXTURE_TODAY,
    };
  }),
];
