import type {
  GetReceiptItemsResponse,
  ReceiptItemResponse,
  ReceiptReadingResponse,
  ReceiptResultResponse,
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
  adjustments: [{ kind: "discount", label: "AČIŪ kortelės nuolaida", amount: "-0.50" }],
  unreadLines: [],
};

export const receiptReading: ReceiptReadingResponse = {
  id: uid("5ec5ec5e", 1),
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

export const receiptReadingUnreadLines: ReceiptReadingResponse = {
  ...receiptReading,
  result: {
    ...maximaReceipt,
    total: "20.40",
    unreadLines: ["Kiausiniai M 10 vnt Z,19 A"],
  },
};

export const receiptUnreadableProblem = problemOf(
  400,
  "receipt.unreadable",
  "No items or total could be read. Take a sharper, straight photo of the whole receipt in even light and try again.",
  { instance: "/api/receipts/read" },
);

export const receiptUnsupportedFileProblem = problemOf(
  400,
  "receipt.unsupportedFile",
  "This file cannot be read as a receipt.",
  { instance: "/api/receipts/read" },
);

export const receiptEngineUnavailableProblem = problemOf(
  503,
  "receipt.engineUnavailable",
  "Receipt reading needs Tesseract with Lithuanian and English language data on the server, and it is not installed.",
  { instance: "/api/receipts/read" },
);

export const receiptItems: GetReceiptItemsResponse = {
  receipts: 14,
  items: [
    {
      key: "pienas",
      name: "Pienas Dvaro 2,5 % 1 l",
      currency: "eur",
      amount: "31.36",
      count: 28,
      lastBought: "2026-09-17",
    },
    {
      key: "kava",
      name: "Kava Paulig Presidentti 500 g",
      currency: "eur",
      amount: "27.96",
      count: 4,
      lastBought: "2026-09-02",
    },
    {
      key: "dantu pasta colgate",
      name: "Dantų pasta Colgate 75 ml",
      currency: "eur",
      amount: "6.18",
      count: 2,
      lastBought: "2026-06-10",
    },
  ],
};

export const noReceiptItems: GetReceiptItemsResponse = { receipts: 0, items: [] };
