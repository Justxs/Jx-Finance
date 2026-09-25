import {
  getCurrenciesMockHandler,
  getExchangeRateMockHandler,
} from "@/api/generated/currencies/currencies.msw";
import { FIXTURE_TODAY, currencies, ratesPerEuro } from "@/storybook/fixtures";
import { currencyCode, notFound, query } from "./http";

export const currencyHandlers = [
  getCurrenciesMockHandler(currencies),
  getExchangeRateMockHandler(({ request }) => {
    const params = query(request);
    const from = currencyCode.safeParse(params.get("from"));
    const to = currencyCode.safeParse(params.get("to"));
    const fromRate = from.success ? ratesPerEuro[from.data] : undefined;
    const toRate = to.success ? ratesPerEuro[to.data] : undefined;
    if (!from.success || !to.success || !fromRate || !toRate) {
      throw notFound();
    }

    return {
      from: from.data,
      to: to.data,
      rate: (toRate / fromRate).toFixed(6),
      asOf: currencies.ratesAsOf ?? FIXTURE_TODAY,
    };
  }),
];
