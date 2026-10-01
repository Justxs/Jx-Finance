import type { FeatureFlags, SpendingShare } from "@/api/generated/model";
import { useSettings } from "@/hooks/use-settings";
import { readPreferences, savePreferences, usePreferences } from "./preferences";

export function toggleMyShare() {
  savePreferences({ myShare: !readPreferences().myShare });
}

export function useMyShare(): boolean {
  const { myShare } = usePreferences();
  const { features } = useSettings();
  return myShare && features.households;
}

export function shareParam(myShare: boolean): SpendingShare | undefined {
  return myShare ? "mine" : undefined;
}

export function useShare(): SpendingShare | undefined {
  return shareParam(useMyShare());
}

export function readShare(features: FeatureFlags): SpendingShare | undefined {
  return shareParam(readPreferences().myShare && features.households);
}

export function withShare<T extends object>(params: T, share: SpendingShare | undefined): T;
export function withShare<T extends object>(
  params: T | undefined,
  share: SpendingShare | undefined,
): T | { share: SpendingShare } | undefined;
export function withShare<T extends object>(
  params: T | undefined,
  share: SpendingShare | undefined,
) {
  return share === undefined ? params : { ...params, share };
}
