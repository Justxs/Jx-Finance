import { presetRange } from "./report-filters/date-range-presets";

interface ReportSearch {
  dateFrom?: string;
  dateTo?: string;
}

export function reportRange(search: ReportSearch, today: Date) {
  const fallback = presetRange("thisMonth", today);
  return {
    dateFrom: search.dateFrom ?? fallback.dateFrom,
    dateTo: search.dateTo ?? fallback.dateTo,
  };
}
