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

const DAY_MS = 86_400_000;

export function daysBetween(from: string, to: string): number | null {
  const start = parseIso(from);
  const end = parseIso(to);
  return start && end ? Math.round((end.getTime() - start.getTime()) / DAY_MS) : null;
}

export function safeTimeZone(timeZone: string | null | undefined): string | undefined {
  if (!timeZone) {
    return undefined;
  }

  try {
    const resolved = new Intl.DateTimeFormat("en-CA", { timeZone }).resolvedOptions();
    return resolved.timeZone ? timeZone : undefined;
  } catch {
    return undefined;
  }
}

export function todayInZone(timeZone: string | null | undefined) {
  const zone = safeTimeZone(timeZone);
  if (!zone) {
    return toIso(new Date());
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function previousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

export function monthBounds(date: Date) {
  return {
    dateFrom: toIso(new Date(date.getFullYear(), date.getMonth(), 1)),
    dateTo: toIso(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

export const MONTH_KEY_PATTERN = /^2\d{3}-(0[1-9]|1[0-2])$/;

export function monthKeyOfIso(isoDate: string) {
  return isoDate.slice(0, 7);
}

export function currentMonthKey(today: Date) {
  return monthKeyOfIso(toIso(today));
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
