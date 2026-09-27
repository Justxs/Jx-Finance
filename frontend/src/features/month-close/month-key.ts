import type { MonthCloseMonthStatus } from "@/api/generated/model";
import { previousMonth, toIso } from "@/lib/calendar";

export const MONTH_KEY_PATTERN = /^2\d{3}-(0[1-9]|1[0-2])$/;

export function monthKeyOfIso(isoDate: string) {
  return isoDate.slice(0, 7);
}

export function yearOf(key: string) {
  return Number(key.slice(0, 4));
}

export function monthDate(key: string) {
  return new Date(yearOf(key), Number(key.slice(5, 7)) - 1, 1);
}

export function shiftMonth(key: string, delta: number) {
  const date = monthDate(key);
  return monthKeyOfIso(toIso(new Date(date.getFullYear(), date.getMonth() + delta, 1)));
}

export function latestEndedMonth(today: Date) {
  return monthKeyOfIso(toIso(previousMonth(today)));
}

export function defaultMonth(today: Date, months: readonly MonthCloseMonthStatus[]) {
  const latest = latestEndedMonth(today);
  const open = months
    .filter((entry) => entry.status === "open" && monthKeyOfIso(entry.month) <= latest)
    .map((entry) => monthKeyOfIso(entry.month))
    .toSorted()
    .at(-1);
  return open ?? latest;
}

export function isClosedStatus(status: MonthCloseMonthStatus["status"]) {
  return status === "closed" || status === "closedChanged";
}
