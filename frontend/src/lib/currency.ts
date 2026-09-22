import { Currency } from "@/api/generated/model";

export const DEFAULT_CURRENCY: Currency = Currency.eur;

export const ALL_CURRENCIES: readonly Currency[] = Object.values(Currency);
