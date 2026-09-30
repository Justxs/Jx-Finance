import type { RecurringBillResponse } from "@/api/generated/model";
import { daysBetween } from "@/lib/calendar";

export const billUrgencies = ["overdue", "thisWeek", "later"] as const;
export type BillUrgency = (typeof billUrgencies)[number];

const WEEK_DAYS = 7;

export function urgencyOf(bill: RecurringBillResponse, today: string): BillUrgency {
  const days = daysBetween(today, bill.nextDueDate) ?? WEEK_DAYS;
  if (days < 0) {
    return "overdue";
  }
  return days < WEEK_DAYS ? "thisWeek" : "later";
}

export function groupBills(bills: readonly RecurringBillResponse[], today: string) {
  const groups: Record<BillUrgency, RecurringBillResponse[]> = {
    overdue: [],
    thisWeek: [],
    later: [],
  };
  const inactive: RecurringBillResponse[] = [];

  for (const bill of bills) {
    if (bill.isActive) {
      groups[urgencyOf(bill, today)].push(bill);
    } else {
      inactive.push(bill);
    }
  }

  return { groups, inactive };
}
