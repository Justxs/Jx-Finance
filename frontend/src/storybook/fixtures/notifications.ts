import type { NotificationResponse, RecurringBillResponse } from "@/api/generated/model";
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
    relatedType: "RecurringBill",
    relatedId: bill.id,
    channel,
    isRead,
    createdAt,
  };
}

export const notifications: NotificationResponse[] = [
  billNotification(ids.notifications.telia, dueSoonBill, false, "inApp", "2026-09-17T06:00:00Z"),
  billNotification(ids.notifications.water, overdueBill, false, "inApp", "2026-09-14T06:00:00Z"),
  billNotification(ids.notifications.ignitis, variableBill, true, "email", "2026-08-20T06:00:00Z"),
  {
    id: ids.notifications.mortgage,
    type: "billDue",
    title: "Būsto paskolos įmoka",
    message: "2026-09-05",
    relatedType: "RecurringBill",
    relatedId: ids.bills.mortgage,
    channel: "inApp",
    isRead: true,
    createdAt: "2026-09-02T06:00:00Z",
  },
];
