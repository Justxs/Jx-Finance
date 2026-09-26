import type { AccountResponse, ConversionResponse, Currency } from "@/api/generated/model";
import { heldCurrencies } from "../held-currencies";

export interface ConversionFormValues {
  accountId: string;
  fromAmount: string;
  fromCurrency: Currency;
  toAmount: string;
  toCurrency: Currency;
  date: string;
  description: string | null;
  feeAmount: string | null;
  feeCurrency: Currency | null;
  feeCategoryId: string | null;
}

export interface ConversionFieldValues {
  accountId: string;
  fromAmount: string;
  fromCurrency: Currency;
  toAmount: string;
  toCurrency: Currency;
  date: string;
  description: string;
  feeAmount: string;
  feeCurrency: Currency;
  feeCategoryId: string;
}

export function otherCurrency(
  account: AccountResponse | undefined,
  sold: Currency,
  usable: readonly Currency[],
): Currency {
  const held = heldCurrencies(account).find((currency) => currency !== sold);

  return held ?? usable.find((currency) => currency !== sold) ?? sold;
}

export function buildValues(value: ConversionFieldValues): ConversionFormValues {
  const hasFee = value.feeAmount.trim() !== "";

  return {
    ...value,
    description: value.description.trim() || null,
    feeAmount: hasFee ? value.feeAmount : null,
    feeCurrency: hasFee ? value.feeCurrency : null,
    feeCategoryId: hasFee && value.feeCategoryId !== "" ? value.feeCategoryId : null,
  };
}

export function valuesOf(conversion: ConversionResponse): ConversionFieldValues {
  return {
    accountId: conversion.accountId,
    fromAmount: conversion.fromAmount,
    fromCurrency: conversion.fromCurrency,
    toAmount: conversion.toAmount,
    toCurrency: conversion.toCurrency,
    date: conversion.date,
    description: conversion.description ?? "",
    feeAmount: conversion.feeAmount ?? "",
    feeCurrency: conversion.feeCurrency ?? conversion.fromCurrency,
    feeCategoryId: conversion.feeCategoryId ?? "",
  };
}
