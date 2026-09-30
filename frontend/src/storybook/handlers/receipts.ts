import {
  getReadReceiptMockHandler,
  getReceiptItemsMockHandler,
  getUpdateReceiptCategoriesMockHandler,
} from "@/api/generated/receipts/receipts.msw";
import { receiptItems, receiptReading } from "@/storybook/fixtures";

export const receiptHandlers = [
  getReadReceiptMockHandler(receiptReading),
  getUpdateReceiptCategoriesMockHandler(),
  getReceiptItemsMockHandler(receiptItems),
];
