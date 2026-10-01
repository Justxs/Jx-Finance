import type { SpreadDirection } from "@/api/generated/model";
import { toIso } from "@/lib/calendar";
import { fromCents, toCents } from "@/lib/money";

export interface SpreadSlice {
  date: string;
  cents: number;
}

function monthsAfter(date: string, offset: number) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const lastDay = new Date(year, month + offset, 0).getDate();
  return toIso(new Date(year, month - 1 + offset, Math.min(day, lastDay)));
}

function firstOffset(months: number, direction: SpreadDirection) {
  return direction === "backward" ? 1 - months : 0;
}

export function spreadSlices(
  date: string,
  amount: string,
  months: number,
  direction: SpreadDirection = "forward",
): SpreadSlice[] {
  const first = firstOffset(months, direction);
  const total = toCents(amount);
  const floor = Math.floor(total / months);
  const left = total - floor * months;
  return Array.from({ length: months }, (_, index) => ({
    date: monthsAfter(date, first + index),
    cents: floor + (index < left ? 1 : 0),
  }));
}

export function spreadMonthly(amount: string, months: number) {
  return fromCents(Math.ceil(toCents(amount) / months));
}

export function spreadFrom(date: string, months: number, direction: SpreadDirection = "forward") {
  return monthsAfter(date, firstOffset(months, direction));
}

export function spreadUntil(date: string, months: number, direction: SpreadDirection = "forward") {
  return monthsAfter(date, firstOffset(months, direction) + months - 1);
}

export function spreadPartWithin(slices: readonly SpreadSlice[], from: string, to: string) {
  return fromCents(
    slices
      .filter((slice) => slice.date >= from && slice.date <= to)
      .reduce((sum, slice) => sum + slice.cents, 0),
  );
}
