export const ACTIVE_HOUSEHOLD_PARAM = "activeHousehold";

export const TRANSACTIONS_EXPORT_CSV_PATH = "/api/transactions/export";

export const TRANSACTIONS_EXPORT_PDF_PATH = "/api/transactions/export/pdf";

export const TAX_SUMMARY_EXPORT_PATH = "/api/investments/tax-summary/export";

export type ExportParams = Record<string, string | number | undefined>;

export function buildExportUrl(path: string, params: ExportParams, activeHouseholdId?: string) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, String(value));
    }
  }
  if (activeHouseholdId) {
    search.set(ACTIVE_HOUSEHOLD_PARAM, activeHouseholdId);
  }
  return `${path}?${search.toString()}`;
}
