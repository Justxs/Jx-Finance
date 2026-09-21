import type {
  BudgetResponse,
  NotificationResponse,
  NotificationType,
  RecurringBillResponse,
} from "@/api/generated/model";
import { ids } from "./base";
import { dueSoonBill, overdueBill, variableBill } from "./recurring-bills";

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

export const notifications: NotificationResponse[] = [
  expenseDueNotification,
  budgetExceededNotification,
  billNotification(ids.notifications.water, overdueBill, false, "inApp", "2026-09-14T06:00:00Z"),
  budgetWarningNotification,
  billNotification(ids.notifications.ignitis, variableBill, true, "email", "2026-08-20T06:00:00Z"),
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
