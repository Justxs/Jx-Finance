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
