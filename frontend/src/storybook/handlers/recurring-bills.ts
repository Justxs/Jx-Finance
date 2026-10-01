import {
  getBillsCalendarMockHandler,
  getConfirmRecurringBillMockHandler,
  getCreateRecurringBillMockHandler,
  getDeleteRecurringBillMockHandler,
  getDismissSubscriptionCandidateMockHandler,
  getRecurringBillMockHandler,
  getRecurringBillsMockHandler,
  getRecurringTotalsMockHandler,
  getSkipRecurringBillMockHandler,
  getSubscriptionCandidatesMockHandler,
  getUpdateRecurringBillMockHandler,
} from "@/api/generated/recurring-bills/recurring-bills.msw";
import {
  billsCalendar,
  dueSoonBill,
  recurringBills,
  recurringTotals,
  subscriptionCandidates,
} from "@/storybook/fixtures";
import { found, readBody } from "./http";
import { NEW_ID, NEW_TRANSACTION_ID, NEW_TRANSFER_ID } from "./ids";
import { byId, byIdFrom, updateFrom } from "./lists";

function advanced(id: unknown) {
  const bill = found(byId(recurringBills, id));
  const [year, month, day] = bill.nextDueDate.split("-").map(Number);
  const next = new Date(Date.UTC(year ?? 2026, month ?? 9, day ?? 1));
  return { ...bill, nextDueDate: next.toISOString().slice(0, 10) };
}

export const recurringBillHandlers = [
  getRecurringBillsMockHandler(recurringBills),
  getBillsCalendarMockHandler(billsCalendar),
  getRecurringTotalsMockHandler(recurringTotals),
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
  getSkipRecurringBillMockHandler(({ params }) => advanced(params.id)),
  getConfirmRecurringBillMockHandler(({ params }) => {
    const bill = advanced(params.id);
    const isTransfer = bill.shape === "transfer";
    return {
      bill,
      transactionId: isTransfer ? null : NEW_TRANSACTION_ID,
      transferId: isTransfer ? NEW_TRANSFER_ID : null,
    };
  }),
];
