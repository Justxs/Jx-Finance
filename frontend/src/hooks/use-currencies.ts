import { useCurrencies } from "@/api/generated";
import type { Currency } from "@/api/generated/model";
import { ALL_CURRENCIES, DEFAULT_CURRENCY } from "@/lib/currency";
import { silentQuery } from "@/lib/query-client";

const currenciesQuery = { staleTime: 5 * 60 * 1000, ...silentQuery } as const;

export function useReportingCurrency(): Currency {
  const currencies = useCurrencies({ query: currenciesQuery });

  return currencies.data?.reportingCurrency ?? DEFAULT_CURRENCY;
}

export function useUsableCurrencies(): readonly Currency[] {
  const currencies = useCurrencies({ query: currenciesQuery });

  return currencies.data?.currencies ?? ALL_CURRENCIES;
}
