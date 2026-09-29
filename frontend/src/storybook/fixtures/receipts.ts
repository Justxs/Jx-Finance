import type {
  ReceiptItemResponse,
  ReceiptReadingResponse,
  ReceiptResultResponse,
  ReceiptSettingsResponse,
} from "@/api/generated/model";
import { ids, uid } from "./base";
import { problemOf } from "./problems";

const { food, health } = ids.categories;

function item(
  name: string,
  amount: string,
  categoryId: string | null,
  extra: Partial<ReceiptItemResponse> = {},
): ReceiptItemResponse {
  return {
    name,
    quantity: null,
    amount,
    discount: "0.00",
    deposit: "0.00",
    categoryId,
    remembered: false,
    ...extra,
  };
}

export const maximaReceipt: ReceiptResultResponse = {
  merchant: "MAXIMA LT, UAB",
  date: "2026-09-26",
  currency: "eur",
  total: "18.21",
  isReturn: false,
  pagesRead: 1,
  pageCount: 1,
  items: [
    item('Duona "Bočių" 800 g', "1.89", food),
    item("Pienas 2,5 % 1 l", "2.38", food, { quantity: "2 x 1,19" }),
    item('Sūris "Džiugas" 180 g', "4.29", food, { discount: "0.86" }),
    item("Bananai", "1.84", food, { quantity: "1,236 kg x 1,49" }),
    item("Mineralinis vanduo 1,5 l", "0.79", food, { deposit: "0.10" }),
    item("Colgate dantų pasta 75 ml", "3.49", health),
    item("Head&Shoulders šampūnas 250 ml", "5.99", health, { discount: "1.20" }),
  ],
  adjustments: [{ kind: "discount", label: "Ačiū kortelės nuolaida", amount: "-0.50" }],
};

export const receiptReading: ReceiptReadingResponse = {
  id: uid("5ec5ec5e", 1),
  model: "claude-sonnet-5",
  cached: false,
  result: maximaReceipt,
  candidates: [],
};

export const receiptReadingWithCandidate: ReceiptReadingResponse = {
  ...receiptReading,
  candidates: [
    {
      id: ids.transactions.maxima,
      accountId: ids.accounts.checking,
      date: "2026-09-26",
      description: "MAXIMA LT, UAB VILNIUS",
      amount: "18.21",
      currency: "eur",
    },
  ],
};

export const receiptReadingMisread: ReceiptReadingResponse = {
  ...receiptReading,
  result: {
    ...maximaReceipt,
    items: maximaReceipt.items.map((entry, index) =>
      index === 0 ? { ...entry, amount: "1.79" } : entry,
    ),
  },
};

export const receiptReadingOneCategory: ReceiptReadingResponse = {
  ...receiptReading,
  result: {
    ...maximaReceipt,
    items: maximaReceipt.items.slice(0, 5),
    adjustments: [],
    total: "10.43",
  },
};

export const receiptReadingRemembered: ReceiptReadingResponse = {
  ...receiptReading,
  cached: true,
  result: {
    ...maximaReceipt,
    items: maximaReceipt.items.map((entry) => ({ ...entry, remembered: true })),
  },
};

export const receiptReadingReturn: ReceiptReadingResponse = {
  ...receiptReading,
  result: {
    ...maximaReceipt,
    date: "2026-09-27",
    total: "4.79",
    isReturn: true,
    items: [item("Head&Shoulders šampūnas 250 ml", "4.79", health)],
    adjustments: [],
  },
};

export const receiptReadingPdf: ReceiptReadingResponse = {
  ...receiptReading,
  result: { ...maximaReceipt, merchant: "Pigu.lt", pagesRead: 3, pageCount: 7 },
};

export const receiptSettings: ReceiptSettingsResponse = {
  enabled: true,
  hasKey: true,
  model: "claude-sonnet-5",
  monthlyLimit: 100,
  readingsThisMonth: 23,
};

export const receiptSettingsEmpty: ReceiptSettingsResponse = {
  enabled: false,
  hasKey: false,
  model: "claude-sonnet-5",
  monthlyLimit: 100,
  readingsThisMonth: 0,
};

export const receiptSettingsOverLimit: ReceiptSettingsResponse = {
  ...receiptSettings,
  readingsThisMonth: 100,
};

export const receiptUnreadableProblem = problemOf(
  400,
  "receipt.unreadable",
  "The receipt could not be read. Take a sharper, straight photo of the whole receipt and try again.",
  { instance: "/api/receipts/read" },
);

export const receiptUnsupportedFileProblem = problemOf(
  400,
  "receipt.unsupportedFile",
  "This file cannot be read as a receipt.",
  { instance: "/api/receipts/read" },
);

export const receiptLimitReachedProblem = problemOf(
  429,
  "receipt.limitReached",
  "This installation has used its 100 receipt reads for this month.",
  { instance: "/api/receipts/read" },
);

export const receiptProviderFailedProblem = problemOf(
  502,
  "receipt.providerFailed",
  "Anthropic could not read the receipt right now. Try again in a minute.",
  { instance: "/api/receipts/read" },
);

export const receiptKeyRejectedProblem = problemOf(
  400,
  "receipt.keyRejected",
  "Anthropic did not accept the API key.",
  { instance: "/api/settings/receipts/test" },
);
