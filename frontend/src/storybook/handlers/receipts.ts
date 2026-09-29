import {
  getReadReceiptMockHandler,
  getUpdateReceiptCategoriesMockHandler,
} from "@/api/generated/receipts/receipts.msw";
import { receiptReading } from "@/storybook/fixtures";

export const receiptHandlers = [
  getReadReceiptMockHandler(receiptReading),
  getUpdateReceiptCategoriesMockHandler(),
];
