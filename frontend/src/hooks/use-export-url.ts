import { useActiveHouseholdId } from "@/stores/active-household-store";

export function useExportUrl(url: string) {
  const activeHouseholdId = useActiveHouseholdId();
  if (!activeHouseholdId) {
    return url;
  }
  const search = new URLSearchParams({ activeHousehold: activeHouseholdId });
  return `${url}${url.includes("?") ? "&" : "?"}${search.toString()}`;
}
