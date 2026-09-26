import type { RecurringBillResponse } from "@/api/generated/model";
import { ids } from "./base";
import { problemOf } from "./problems";

type Defaulted = "shape" | "kind" | "toAccountId" | "cadence" | "isActive";

type BillSeed = Omit<RecurringBillResponse, Defaulted> &
  Partial<Pick<RecurringBillResponse, Defaulted>>;

function bill(seed: BillSeed): RecurringBillResponse {
  return {
    shape: "expense",
    kind: "fixed",
    toAccountId: null,
    cadence: "monthly",
    isActive: true,
    ...seed,
  };
}

export const dueSoonBill = bill({
  id: ids.bills.telia,
  name: "Telia – mobilusis ryšys ir internetas",
  amount: "24.99",
  categoryId: ids.categories.telecom,
  accountId: ids.accounts.checking,
  nextDueDate: "2026-09-20",
  remindDaysBefore: 3,
});

export const variableBill = bill({
  id: ids.bills.ignitis,
  name: "Ignitis – elektra",
  kind: "variable",
  amount: null,
  categoryId: ids.categories.utilities,
  accountId: ids.accounts.shared,
  nextDueDate: "2026-09-25",
  remindDaysBefore: 5,
});

export const overdueBill = bill({
  id: ids.bills.water,
  name: "Vilniaus vandenys",
  kind: "variable",
  amount: null,
  categoryId: ids.categories.utilities,
  accountId: ids.accounts.shared,
  nextDueDate: "2026-09-16",
  remindDaysBefore: 2,
});

export const inactiveBill = bill({
  id: ids.bills.netflix,
  name: "Netflix",
  amount: "13.99",
  categoryId: ids.categories.entertainment,
  accountId: ids.accounts.checking,
  nextDueDate: "2026-07-01",
  remindDaysBefore: 0,
  isActive: false,
});

export const incomeBill = bill({
  id: ids.bills.salary,
  name: "Atlyginimas",
  shape: "income",
  amount: "2180.00",
  categoryId: ids.categories.salary,
  accountId: ids.accounts.checking,
  nextDueDate: "2026-10-10",
  remindDaysBefore: 1,
});

export const transferBill = bill({
  id: ids.bills.savingsOrder,
  name: "Periodinis pavedimas į taupomąją",
  shape: "transfer",
  amount: "250.00",
  categoryId: null,
  accountId: ids.accounts.checking,
  toAccountId: ids.accounts.savings,
  nextDueDate: "2026-10-12",
  remindDaysBefore: 2,
});

export const crossCurrencyTransferBill = bill({
  id: ids.bills.brokerTopUp,
  name: "Papildymas doleriais į brokerio sąskaitą",
  shape: "transfer",
  amount: "300.00",
  categoryId: null,
  accountId: ids.accounts.checking,
  toAccountId: ids.accounts.broker,
  cadence: "quarterly",
  nextDueDate: "2026-11-02",
  remindDaysBefore: 5,
});

export const recurringBills: RecurringBillResponse[] = [
  overdueBill,
  dueSoonBill,
  variableBill,
  incomeBill,
  transferBill,
  crossCurrencyTransferBill,
  bill({
    id: ids.bills.mortgage,
    name: "Būsto paskolos įmoka",
    amount: "612.00",
    categoryId: ids.categories.housing,
    accountId: ids.accounts.shared,
    nextDueDate: "2026-10-05",
    remindDaysBefore: 3,
  }),
  bill({
    id: ids.bills.insurance,
    name: "Privalomasis ir KASKO automobilio draudimas (Lietuvos draudimas), metinė įmoka",
    amount: "286.40",
    categoryId: ids.categories.transport,
    accountId: null,
    cadence: "yearly",
    nextDueDate: "2027-03-14",
    remindDaysBefore: 14,
  }),
  inactiveBill,
];

export const billStaleProblem = problemOf(
  409,
  "conflict.stale",
  "The bill is no longer due on the expected date.",
);

export const billInactiveProblem = problemOf(
  409,
  "recurringBill.inactive",
  "An inactive recurring entry cannot be confirmed.",
);

export const billReceivedAmountProblem = problemOf(
  400,
  "transfer.receivedAmountRequired",
  "A transfer between currencies needs the received amount.",
  { title: "Bad Request" },
);

export const billCategoryProblem = problemOf(
  400,
  "category.wrongType",
  "A recurring expense needs an expense category.",
  { name: "categoryId" },
);
