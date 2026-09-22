import { monthBounds, previousMonth, toIso } from "@/lib/calendar";

export type ReportPreset = "thisMonth" | "lastMonth" | "thisYear" | "lastYear" | "custom";

export function presetRange(preset: ReportPreset, now: Date): { dateFrom: string; dateTo: string } {
  const year = now.getFullYear();

  switch (preset) {
    case "lastMonth":
      return monthBounds(previousMonth(now));
    case "thisYear":
      return { dateFrom: `${year}-01-01`, dateTo: toIso(now) };
    case "lastYear":
      return { dateFrom: `${year - 1}-01-01`, dateTo: `${year - 1}-12-31` };
    case "thisMonth":
    default:
      return { dateFrom: monthBounds(now).dateFrom, dateTo: toIso(now) };
  }
}

export function detectPreset(
  dateFrom: string | undefined,
  dateTo: string | undefined,
  now: Date,
): ReportPreset {
  if (!dateFrom || !dateTo) {
    return "thisMonth";
  }

  const presets: ReportPreset[] = ["thisMonth", "lastMonth", "thisYear", "lastYear"];
  for (const preset of presets) {
    const range = presetRange(preset, now);
    if (range.dateFrom === dateFrom && range.dateTo === dateTo) {
      return preset;
    }
  }

  return "custom";
}
