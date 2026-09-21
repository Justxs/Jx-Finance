import type { ReportComparisonMode } from "@/api/generated/model";
import { presetRange } from "./report-filters/date-range-presets";

interface ReportSearch {
  dateFrom?: string;
  dateTo?: string;
  comparison?: ReportComparisonMode;
}

export function reportRange(search: ReportSearch, today: Date) {
  const fallback = presetRange("thisMonth", today);
  return {
    dateFrom: search.dateFrom ?? fallback.dateFrom,
    dateTo: search.dateTo ?? fallback.dateTo,
  };
}

export function reportComparison(search: ReportSearch): ReportComparisonMode {
  return search.comparison ?? "none";
}

export function reportParams(search: ReportSearch, today: Date) {
  const comparison = reportComparison(search);
  const range = reportRange(search, today);
  return comparison === "none" ? { ...range, comparison: undefined } : { ...range, comparison };
}
