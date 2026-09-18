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

export function todayInZone(timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return toIso(new Date());
  }
}

export function monthBounds(date: Date = new Date()) {
  return {
    dateFrom: toIso(new Date(date.getFullYear(), date.getMonth(), 1)),
    dateTo: toIso(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}
