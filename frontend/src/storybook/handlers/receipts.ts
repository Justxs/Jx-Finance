import {
  getForgetReceiptItemCategoryMockHandler,
  getReadReceiptMockHandler,
  getReceiptItemCategoriesMockHandler,
  getReceiptItemsMockHandler,
  getUpdateReceiptCategoriesMockHandler,
} from "@/api/generated/receipts/receipts.msw";
import { receiptItems, receiptReading, rememberedItemCategories } from "@/storybook/fixtures";

export const receiptHandlers = [
  getReadReceiptMockHandler(receiptReading),
  getUpdateReceiptCategoriesMockHandler(),
  getReceiptItemsMockHandler(receiptItems),
  getReceiptItemCategoriesMockHandler(rememberedItemCategories),
  getForgetReceiptItemCategoryMockHandler(),
];
