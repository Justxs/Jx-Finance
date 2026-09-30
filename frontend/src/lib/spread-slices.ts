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

export function spreadSlices(date: string, amount: string, months: number): SpreadSlice[] {
  const total = toCents(amount);
  const floor = Math.floor(total / months);
  const left = total - floor * months;
  return Array.from({ length: months }, (_, index) => ({
    date: monthsAfter(date, index),
    cents: floor + (index < left ? 1 : 0),
  }));
}

export function spreadMonthly(amount: string, months: number) {
  return fromCents(Math.ceil(toCents(amount) / months));
}

export function spreadUntil(date: string, months: number) {
  return monthsAfter(date, months - 1);
}

export function spreadPartWithin(slices: readonly SpreadSlice[], from: string, to: string) {
  return fromCents(
    slices
      .filter((slice) => slice.date >= from && slice.date <= to)
      .reduce((sum, slice) => sum + slice.cents, 0),
  );
}
