import type { ProblemDetails, RecurringBillResponse } from "@/api/generated/model";
import { ids } from "./base";

export const dueSoonBill: RecurringBillResponse = {
  id: ids.bills.telia,
  name: "Telia – mobilusis ryšys ir internetas",
  shape: "expense",
  kind: "fixed",
  amount: "24.99",
  categoryId: ids.categories.telecom,
  accountId: ids.accounts.checking,
  toAccountId: null,
  cadence: "monthly",
  nextDueDate: "2026-09-20",
  remindDaysBefore: 3,
  isActive: true,
};

export const variableBill: RecurringBillResponse = {
  id: ids.bills.ignitis,
  name: "Ignitis – elektra",
  shape: "expense",
  kind: "variable",
  amount: null,
  categoryId: ids.categories.utilities,
  accountId: ids.accounts.shared,
  toAccountId: null,
  cadence: "monthly",
  nextDueDate: "2026-09-25",
  remindDaysBefore: 5,
  isActive: true,
};

export const overdueBill: RecurringBillResponse = {
  id: ids.bills.water,
  name: "Vilniaus vandenys",
  shape: "expense",
  kind: "variable",
  amount: null,
  categoryId: ids.categories.utilities,
  accountId: ids.accounts.shared,
  toAccountId: null,
  cadence: "monthly",
  nextDueDate: "2026-09-16",
  remindDaysBefore: 2,
  isActive: true,
};

export const inactiveBill: RecurringBillResponse = {
  id: ids.bills.netflix,
  name: "Netflix",
  shape: "expense",
  kind: "fixed",
  amount: "13.99",
  categoryId: ids.categories.entertainment,
  accountId: ids.accounts.checking,
  toAccountId: null,
  cadence: "monthly",
  nextDueDate: "2026-07-01",
  remindDaysBefore: 0,
  isActive: false,
};

export const incomeBill: RecurringBillResponse = {
  id: ids.bills.salary,
  name: "Atlyginimas",
  shape: "income",
  kind: "fixed",
  amount: "2180.00",
  categoryId: ids.categories.salary,
  accountId: ids.accounts.checking,
  toAccountId: null,
  cadence: "monthly",
  nextDueDate: "2026-10-10",
  remindDaysBefore: 1,
  isActive: true,
};

export const transferBill: RecurringBillResponse = {
  id: ids.bills.savingsOrder,
  name: "Periodinis pavedimas į taupomąją",
  shape: "transfer",
  kind: "fixed",
  amount: "250.00",
  categoryId: null,
  accountId: ids.accounts.checking,
  toAccountId: ids.accounts.savings,
  cadence: "monthly",
  nextDueDate: "2026-10-12",
  remindDaysBefore: 2,
  isActive: true,
};

export const crossCurrencyTransferBill: RecurringBillResponse = {
  id: ids.bills.brokerTopUp,
  name: "Papildymas doleriais į brokerio sąskaitą",
  shape: "transfer",
  kind: "fixed",
  amount: "300.00",
  categoryId: null,
  accountId: ids.accounts.checking,
  toAccountId: ids.accounts.broker,
  cadence: "quarterly",
  nextDueDate: "2026-11-02",
  remindDaysBefore: 5,
  isActive: true,
};

export const recurringBills: RecurringBillResponse[] = [
  overdueBill,
  dueSoonBill,
  variableBill,
  incomeBill,
  transferBill,
  crossCurrencyTransferBill,
  {
    id: ids.bills.mortgage,
    name: "Būsto paskolos įmoka",
    shape: "expense",
    kind: "fixed",
    amount: "612.00",
    categoryId: ids.categories.housing,
    accountId: ids.accounts.shared,
    toAccountId: null,
    cadence: "monthly",
    nextDueDate: "2026-10-05",
    remindDaysBefore: 3,
    isActive: true,
  },
  {
    id: ids.bills.insurance,
    name: "Privalomasis ir KASKO automobilio draudimas (Lietuvos draudimas), metinė įmoka",
    shape: "expense",
    kind: "fixed",
    amount: "286.40",
    categoryId: ids.categories.transport,
    accountId: null,
    toAccountId: null,
    cadence: "yearly",
    nextDueDate: "2027-03-14",
    remindDaysBefore: 14,
    isActive: true,
  },
  inactiveBill,
];

export const billStaleProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.8",
  title: "Conflict",
  status: 409,
  code: "conflict.stale",
  detail: "The bill is no longer due on the expected date.",
};

export const billInactiveProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.8",
  title: "Conflict",
  status: 409,
  code: "recurringBill.inactive",
  detail: "An inactive recurring entry cannot be confirmed.",
};

export const billReceivedAmountProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "Bad Request",
  status: 400,
  code: "transfer.receivedAmountRequired",
  detail: "A transfer between currencies needs the received amount.",
};

export const billCategoryProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  errors: [
    {
      name: "categoryId",
      reason: "A recurring expense needs an expense category.",
      code: "category.wrongType",
    },
  ],
};
