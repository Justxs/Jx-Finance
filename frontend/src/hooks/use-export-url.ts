import { useActiveHouseholdId } from "@/stores/active-household-store";

type ExportParams = Record<string, string | number | undefined>;

export function useExportUrl(path: string, params: ExportParams) {
  const activeHouseholdId = useActiveHouseholdId();
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, String(value));
    }
  }
  if (activeHouseholdId) {
    search.set("activeHousehold", activeHouseholdId);
  }
  return `${path}?${search.toString()}`;
}
