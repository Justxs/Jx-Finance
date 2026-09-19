import type { CurrenciesResponse, Currency } from "@/api/generated/model";
import { settings } from "./settings";

export const currencies: CurrenciesResponse = {
  reportingCurrency: "eur",
  currencies: settings.enabledCurrencies,
  ratesAsOf: "2026-09-18",
};

export const ratesPerEuro: Partial<Record<Currency, number>> = {
  eur: 1,
  usd: 1.0842,
  gbp: 0.8417,
  pln: 4.2615,
  chf: 0.9388,
  sek: 11.042,
  nok: 11.618,
};
