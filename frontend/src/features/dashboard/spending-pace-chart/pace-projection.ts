import type { RecurringBillResponse } from "@/api/generated/model";
import { parseIso } from "@/lib/calendar";

const WEEK_DAYS = 7;

export interface DueBill {
  day: number;
  amount: number;
}

export function billsDueAfter(
  bills: readonly RecurringBillResponse[],
  today: Date,
  lastDay: number,
): DueBill[] {
  return bills
    .filter((bill) => bill.isActive && bill.shape === "expense" && bill.amount !== null)
    .flatMap((bill) => {
      const due = parseIso(bill.nextDueDate);
      if (
        !due ||
        due.getFullYear() !== today.getFullYear() ||
        due.getMonth() !== today.getMonth()
      ) {
        return [];
      }
      const step = bill.cadence === "weekly" ? WEEK_DAYS : lastDay;
      const days: DueBill[] = [];
      for (let day = due.getDate(); day <= lastDay; day += step) {
        if (day > today.getDate()) {
          days.push({ day, amount: Number(bill.amount) });
        }
      }
      return days;
    });
}

export function projectedTotals(
  spent: number,
  today: number,
  average: readonly number[],
  bills: readonly DueBill[],
  lastDay: number,
): (number | undefined)[] {
  const averageToday = average[today - 1] ?? 0;
  const averageRest = Math.max(0, (average[lastDay - 1] ?? 0) - averageToday);
  const billsRest = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const everyday = Math.max(0, averageRest - billsRest);
  if (today >= lastDay || everyday + billsRest === 0) {
    return [];
  }

  function share(day: number) {
    return averageRest > 0
      ? ((average[day - 1] ?? 0) - averageToday) / averageRest
      : (day - today) / (lastDay - today);
  }

  function billsBy(day: number) {
    return bills.filter((bill) => bill.day <= day).reduce((sum, bill) => sum + bill.amount, 0);
  }

  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    return day < today ? undefined : spent + everyday * share(day) + billsBy(day);
  });
}
