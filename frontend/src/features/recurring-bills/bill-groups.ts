import type { RecurringBillResponse } from "@/api/generated/model";
import { parseIso } from "@/lib/calendar";

export const billUrgencies = ["overdue", "thisWeek", "later"] as const;
export type BillUrgency = (typeof billUrgencies)[number];

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;

export function daysUntil(date: string, today: string): number | null {
  const due = parseIso(date);
  const now = parseIso(today);
  return due && now ? Math.round((due.getTime() - now.getTime()) / DAY_MS) : null;
}

function urgencyOf(bill: RecurringBillResponse, today: string): BillUrgency {
  const days = daysUntil(bill.nextDueDate, today) ?? WEEK_DAYS;
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
