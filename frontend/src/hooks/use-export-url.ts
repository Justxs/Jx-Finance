import { buildExportUrl, type ExportParams } from "@/lib/export-url";
import { useActiveHouseholdId } from "@/stores/active-household-store";

export function useExportUrl(path: string, params: ExportParams) {
  const activeHouseholdId = useActiveHouseholdId();
  return buildExportUrl(path, params, activeHouseholdId);
}
