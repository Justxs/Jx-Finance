import {
  getConfirmRecurringBillMockHandler,
  getCreateRecurringBillMockHandler,
  getDeleteRecurringBillMockHandler,
  getDismissSubscriptionCandidateMockHandler,
  getRecurringBillMockHandler,
  getRecurringBillsMockHandler,
  getSubscriptionCandidatesMockHandler,
  getUpdateRecurringBillMockHandler,
} from "@/api/generated/recurring-bills/recurring-bills.msw";
import { dueSoonBill, recurringBills, subscriptionCandidates } from "@/storybook/fixtures";
import { found, readBody } from "./http";
import { NEW_ID, NEW_TRANSACTION_ID, NEW_TRANSFER_ID } from "./ids";
import { byId, byIdFrom, updateFrom } from "./lists";

export const recurringBillHandlers = [
  getRecurringBillsMockHandler(recurringBills),
  getSubscriptionCandidatesMockHandler(subscriptionCandidates),
  getDismissSubscriptionCandidateMockHandler(),
  getCreateRecurringBillMockHandler(async ({ request }) => ({
    ...dueSoonBill,
    id: NEW_ID,
    isActive: true,
    ...(await readBody(request)),
  })),
  getRecurringBillMockHandler(byIdFrom(recurringBills)),
  getUpdateRecurringBillMockHandler(updateFrom(recurringBills)),
  getDeleteRecurringBillMockHandler(),
  getConfirmRecurringBillMockHandler(({ params }) => {
    const bill = found(byId(recurringBills, params.id));
    const [year, month, day] = bill.nextDueDate.split("-").map(Number);
    const next = new Date(Date.UTC(year ?? 2026, month ?? 9, day ?? 1));
    const isTransfer = bill.shape === "transfer";
    return {
      bill: { ...bill, nextDueDate: next.toISOString().slice(0, 10) },
      transactionId: isTransfer ? null : NEW_TRANSACTION_ID,
      transferId: isTransfer ? NEW_TRANSFER_ID : null,
    };
  }),
];
