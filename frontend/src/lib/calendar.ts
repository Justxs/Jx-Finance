export interface MonthView {
  year: number;
  month: number;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toIso(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseIso(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function monthOf(date: Date): MonthView {
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function shiftMonth(view: MonthView, delta: number): MonthView {
  return monthOf(new Date(view.year, view.month + delta, 1));
}

export function gridDays(view: MonthView): Date[] {
  const first = new Date(view.year, view.month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    return new Date(view.year, view.month, index + 1 - offset);
  });
}

export function weekdayLabels(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: "short" });
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2024, 0, index + 1)));
}
