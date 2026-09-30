import type { BillOccurrence, BillsCalendarResponse } from "@/api/generated/model";
import { FIXTURE_MONTH_END, FIXTURE_MONTH_START, ids } from "./base";
import {
  dueSoonBill,
  incomeBill,
  mortgageBill,
  overdueBill,
  recurringBills,
  transferBill,
  variableBill,
} from "./recurring-bills";

type OccurrenceSeed = Pick<BillOccurrence, "date" | "status"> &
  Partial<Omit<BillOccurrence, "billId" | "name" | "shape">>;

function occurrenceOf(
  bill: { id: string; name: string; shape: BillOccurrence["shape"]; accountId: string | null },
  seed: OccurrenceSeed,
): BillOccurrence {
  return {
    billId: bill.id,
    name: bill.name,
    shape: bill.shape,
    amount: null,
    currency: "eur",
    estimated: false,
    isNextDue: false,
    unconfirmed: false,
    accountNotVisible: false,
    accountId: bill.accountId,
    transactionId: null,
    ...seed,
  };
}

export const paidOccurrence = occurrenceOf(mortgageBill, {
  date: "2026-09-05",
  status: "paid",
  amount: "612.00",
  transactionId: ids.transactions.maxima,
});

export const paidIncomeOccurrence = occurrenceOf(incomeBill, {
  date: "2026-09-10",
  status: "paid",
  amount: "2180.00",
  transactionId: ids.transactions.salary,
});

export const noMatchOccurrence = occurrenceOf(transferBill, {
  date: "2026-09-12",
  status: "noMatch",
  amount: "250.00",
});

export const overdueOccurrence = occurrenceOf(overdueBill, {
  date: "2026-09-16",
  status: "overdue",
  amount: "18.40",
  estimated: true,
  isNextDue: true,
});

export const dueOccurrence = occurrenceOf(dueSoonBill, {
  date: "2026-09-20",
  status: "due",
  amount: "24.99",
  isNextDue: true,
});

export const estimatedOccurrence = occurrenceOf(variableBill, {
  date: "2026-09-25",
  status: "due",
  amount: "41.20",
  estimated: true,
  isNextDue: true,
});

export const unconfirmedOccurrence: BillOccurrence = {
  ...dueOccurrence,
  status: "paid",
  amount: "27.99",
  unconfirmed: true,
  transactionId: ids.transactions.uncategorised,
};

const insuranceBill = recurringBills.find((bill) => bill.id === ids.bills.insurance);

export const unpricedOccurrence = occurrenceOf(
  {
    id: ids.bills.insurance,
    name: insuranceBill?.name ?? "",
    shape: "expense",
    accountId: null,
  },
  { date: "2026-09-14", status: "due", currency: null },
);

export const hiddenAccountOccurrence: BillOccurrence = {
  ...estimatedOccurrence,
  amount: null,
  currency: null,
  estimated: false,
  accountNotVisible: true,
};

export const billsCalendar: BillsCalendarResponse = {
  from: FIXTURE_MONTH_START,
  to: FIXTURE_MONTH_END,
  expectedOut: "696.59",
  expectedIn: "2180.00",
  paidOut: "612.00",
  partial: true,
  unpriced: 0,
  occurrences: [
    paidOccurrence,
    paidIncomeOccurrence,
    noMatchOccurrence,
    overdueOccurrence,
    dueOccurrence,
    estimatedOccurrence,
  ],
};

export const unconfirmedBillsCalendar: BillsCalendarResponse = {
  ...billsCalendar,
  paidOut: "639.99",
  occurrences: billsCalendar.occurrences.map((occurrence) =>
    occurrence === dueOccurrence ? unconfirmedOccurrence : occurrence,
  ),
};

export const unpricedBillsCalendar: BillsCalendarResponse = {
  ...billsCalendar,
  unpriced: 1,
  occurrences: [...billsCalendar.occurrences, unpricedOccurrence].toSorted((a, b) =>
    a.date.localeCompare(b.date),
  ),
};

export const emptyBillsCalendar: BillsCalendarResponse = {
  from: FIXTURE_MONTH_START,
  to: FIXTURE_MONTH_END,
  expectedOut: "0.00",
  expectedIn: "0.00",
  paidOut: "0.00",
  partial: false,
  unpriced: 0,
  occurrences: [],
};
