import type { ConversionResponse, ProblemDetails } from "@/api/generated/model";
import { ids, uid } from "./base";

export const importedConversion: ConversionResponse = {
  id: ids.conversions.imported,
  accountId: ids.accounts.broker,
  fromAmount: "1200.00",
  fromCurrency: "eur",
  toAmount: "1298.64",
  toCurrency: "usd",
  rate: "1.082200",
  date: "2026-08-04",
  description: "EUR.USD",
  feeAmount: "1.85",
  feeCurrency: "eur",
  feeTransactionId: uid("55555555", 901),
  createdAt: "2026-08-05T03:10:00Z",
  feeCategoryId: null,
  isImported: true,
};

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
    feeCategoryId: ids.categories.shopping,
    isImported: false,
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
    feeCategoryId: null,
    isImported: false,
  },
  importedConversion,
];

export const conversionWithFee = conversions[0] as ConversionResponse;

export const conversionWithoutFee = conversions[1] as ConversionResponse;

export const conversionFeeSplitProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  errors: [
    {
      name: "feeAmount",
      reason: "The fee transaction was split by hand. Change it under Transactions.",
      code: "transaction.splitNotAllowed",
    },
  ],
};

export const conversionRateUnavailableProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  errors: [
    {
      name: "date",
      reason: "No exchange rate is stored for that date.",
      code: "exchangeRate.unavailable",
    },
  ],
};

export const conversionReadOnlyProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.8",
  title: "Conflict",
  status: 409,
  code: "resource.readOnly",
  detail: "Imported conversions cannot be edited.",
};
