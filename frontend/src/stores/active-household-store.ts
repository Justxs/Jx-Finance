import type { Scope } from "@/api/generated/model";
import { readPreferences, savePreferences, usePreferences } from "./preferences";

interface SharingDefaults {
  scope: Scope;
  householdId: string;
}

export function readActiveHouseholdId(): string | undefined {
  return readPreferences().activeHouseholdId;
}

export function setActiveHousehold(activeHouseholdId: string | undefined) {
  savePreferences({ activeHouseholdId });
}

export function useActiveHouseholdId(): string | undefined {
  return usePreferences().activeHouseholdId;
}

export function useSharingDefaults(households: readonly { id: string }[]): SharingDefaults {
  const activeHouseholdId = useActiveHouseholdId();
  const known = households.some((household) => household.id === activeHouseholdId);
  if (!activeHouseholdId || !known) {
    return { scope: "personal", householdId: "" };
  }

  return { scope: "shared", householdId: activeHouseholdId };
}
