import type {
  BudgetResponse,
  NotificationResponse,
  NotificationType,
  RecurringBillResponse,
} from "@/api/generated/model";
import { ids } from "./base";
import { overLimitBudget, weeklyRolloverBudget } from "./budgets";
import {
  dueSoonBill,
  incomeBill,
  overdueBill,
  transferBill,
  variableBill,
} from "./recurring-bills";
import { longDescriptionTransaction } from "./transactions";

function billNotification(
  id: string,
  bill: RecurringBillResponse,
  isRead: boolean,
  channel: NotificationResponse["channel"],
  createdAt: string,
): NotificationResponse {
  return {
    id,
    type: "billDue",
    title: bill.name,
    message: bill.nextDueDate,
    payload: { dueDate: bill.nextDueDate, shape: bill.shape },
    relatedType: "RecurringBill",
    relatedId: bill.id,
    channel,
    isRead,
    createdAt,
  };
}

function budgetNotification(
  id: string,
  budget: BudgetResponse,
  type: NotificationType,
  thresholdPercent: number,
  createdAt: string,
): NotificationResponse {
  return {
    id,
    type,
    title: budget.categoryName,
    message: `${thresholdPercent}% of the ${budget.period} limit`,
    payload: { thresholdPercent, period: budget.period },
    relatedType: "Budget",
    relatedId: budget.id,
    channel: "inApp",
    isRead: false,
    createdAt,
  };
}

export const budgetWarningNotification: NotificationResponse = budgetNotification(
  ids.notifications.foodWarning,
  overLimitBudget,
  "budgetWarning",
  80,
  "2026-09-16T05:00:00Z",
);

export const budgetExceededNotification: NotificationResponse = budgetNotification(
  ids.notifications.transportExceeded,
  weeklyRolloverBudget,
  "budgetExceeded",
  100,
  "2026-09-18T05:00:00Z",
);

export const expenseDueNotification: NotificationResponse = billNotification(
  ids.notifications.telia,
  dueSoonBill,
  false,
  "inApp",
  "2026-09-17T06:00:00Z",
);

export const incomeDueNotification: NotificationResponse = billNotification(
  ids.notifications.salary,
  incomeBill,
  false,
  "inApp",
  "2026-09-19T06:00:00Z",
);

export const transferDueNotification: NotificationResponse = billNotification(
  ids.notifications.savingsOrder,
  transferBill,
  false,
  "inApp",
  "2026-09-19T06:05:00Z",
);

export const unusualAmountNotification: NotificationResponse = {
  id: ids.notifications.unusualSenukai,
  type: "unusualAmount",
  title: "Senukai, Ukmergės g. 369, Vilnius",
  message: "249.00 EUR: 4x the usual 61.90 EUR",
  payload: {
    transactionId: longDescriptionTransaction.id,
    amount: "249.00",
    typicalAmount: "61.90",
    factor: 4,
    currency: "eur",
  },
  relatedType: "Transaction",
  relatedId: longDescriptionTransaction.id,
  channel: "inApp",
  isRead: false,
  createdAt: "2026-09-18T07:00:00Z",
};

export const unusualAmountsNotification: NotificationResponse = {
  id: ids.notifications.unusualSummary,
  type: "unusualAmounts",
  title: "Senukai, Maxima, Circle K…",
  message: "5 expenses are well above their usual amount",
  payload: { count: 5 },
  relatedType: null,
  relatedId: null,
  channel: "inApp",
  isRead: false,
  createdAt: "2026-09-18T07:05:00Z",
};

export const priceRiseNotification: NotificationResponse = {
  id: ids.notifications.teliaPriceRise,
  type: "recurringPriceRise",
  title: dueSoonBill.name,
  message: "Charged 27.99, expected 24.99",
  payload: {
    billId: dueSoonBill.id,
    amount: "27.99",
    typicalAmount: "24.99",
    currency: "eur",
  },
  relatedType: "RecurringBill",
  relatedId: dueSoonBill.id,
  channel: "inApp",
  isRead: false,
  createdAt: "2026-09-18T07:10:00Z",
};

export const monthReadyNotification: NotificationResponse = {
  id: ids.notifications.augustReady,
  type: "monthReadyToClose",
  title: "August 2026",
  message: "2026-08",
  payload: { month: "2026-08-01" },
  relatedType: null,
  relatedId: null,
  channel: "inApp",
  isRead: false,
  createdAt: "2026-09-01T07:00:00Z",
};

export const monthlyDigestNotification: NotificationResponse = {
  id: ids.notifications.augustDigest,
  type: "monthlyDigest",
  title: "August 2026",
  message: "2026-08",
  payload: {
    month: "2026-08-01",
    digest: {
      currency: "eur",
      income: "3200.00",
      expense: "2450.00",
      net: "750.00",
      keptPercent: 23,
      movers: [{ name: "Maistas", amount: "420.00", previous: "380.00" }],
      uncategorized: 3,
      unusual: 0,
      unconfirmedRecurring: null,
      accountsNeedingAttention: 1,
      closed: false,
    },
  },
  relatedType: null,
  relatedId: null,
  channel: "inApp",
  isRead: false,
  createdAt: "2026-09-01T07:05:00Z",
};

export const notifications: NotificationResponse[] = [
  expenseDueNotification,
  budgetExceededNotification,
  billNotification(ids.notifications.water, overdueBill, false, "inApp", "2026-09-14T06:00:00Z"),
  budgetWarningNotification,
  billNotification(ids.notifications.ignitis, variableBill, true, "email", "2026-08-20T06:00:00Z"),
  incomeDueNotification,
  transferDueNotification,
  {
    id: ids.notifications.mortgage,
    type: "billDue",
    title: "Būsto paskolos įmoka",
    message: "2026-09-05",
    payload: { dueDate: "2026-09-05" },
    relatedType: "RecurringBill",
    relatedId: ids.bills.mortgage,
    channel: "inApp",
    isRead: true,
    createdAt: "2026-09-02T06:00:00Z",
  },
];
