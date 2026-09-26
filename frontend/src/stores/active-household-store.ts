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

interface Shared {
  scope: Scope;
  householdId: string | null;
}

export function useSharingDefaults(
  households: readonly { id: string }[],
  initial?: Shared,
): SharingDefaults {
  const activeHouseholdId = useActiveHouseholdId();
  if (initial) {
    return { scope: initial.scope, householdId: initial.householdId ?? "" };
  }
  const known = households.some((household) => household.id === activeHouseholdId);
  if (!activeHouseholdId || !known) {
    return { scope: "personal", householdId: "" };
  }

  return { scope: "shared", householdId: activeHouseholdId };
}
