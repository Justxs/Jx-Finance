import {
  getConfirmRecurringBillMockHandler,
  getCreateRecurringBillMockHandler,
  getDeleteRecurringBillMockHandler,
  getRecurringBillMockHandler,
  getRecurringBillsMockHandler,
  getUpdateRecurringBillMockHandler,
} from "@/api/generated/recurring-bills/recurring-bills.msw";
import { dueSoonBill, recurringBills } from "@/storybook/fixtures";
import { found, readBody } from "./http";
import { NEW_ID, NEW_TRANSACTION_ID } from "./ids";
import { byId } from "./lists";

export const recurringBillHandlers = [
  getRecurringBillsMockHandler(recurringBills),
  getCreateRecurringBillMockHandler(async ({ request }) => ({
    ...dueSoonBill,
    id: NEW_ID,
    isActive: true,
    ...(await readBody(request)),
  })),
  getRecurringBillMockHandler(({ params }) => found(byId(recurringBills, params.id))),
  getUpdateRecurringBillMockHandler(async ({ params, request }) => ({
    ...found(byId(recurringBills, params.id)),
    ...(await readBody(request)),
  })),
  getDeleteRecurringBillMockHandler(),
  getConfirmRecurringBillMockHandler(({ params }) => {
    const bill = found(byId(recurringBills, params.id));
    const [year, month, day] = bill.nextDueDate.split("-").map(Number);
    const next = new Date(Date.UTC(year ?? 2026, month ?? 9, day ?? 1));
    return {
      bill: { ...bill, nextDueDate: next.toISOString().slice(0, 10) },
      transactionId: NEW_TRANSACTION_ID,
    };
  }),
];
