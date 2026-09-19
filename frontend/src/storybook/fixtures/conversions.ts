import type { ConversionResponse } from "@/api/generated/model";
import { ids, uid } from "./base";

export const conversions: ConversionResponse[] = [
  {
    id: ids.conversions.eurToUsd,
    accountId: ids.accounts.broker,
    fromAmount: "2500.00",
    fromCurrency: "eur",
    toAmount: "2710.40",
    toCurrency: "usd",
    rate: "1.084160",
    date: "2026-09-08",
    description: "USD akcijoms",
    feeAmount: "2.00",
    feeCurrency: "eur",
    feeTransactionId: uid("55555555", 900),
    createdAt: "2026-09-08T14:31:00Z",
  },
  {
    id: ids.conversions.usdToGbp,
    accountId: ids.accounts.broker,
    fromAmount: "470.00",
    fromCurrency: "usd",
    toAmount: "350.00",
    toCurrency: "gbp",
    rate: "0.744681",
    date: "2026-08-21",
    description: null,
    feeAmount: null,
    feeCurrency: null,
    feeTransactionId: null,
    createdAt: "2026-08-21T11:02:00Z",
  },
];
