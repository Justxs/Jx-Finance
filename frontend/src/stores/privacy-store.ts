import { readPreferences, savePreferences, usePreferences } from "./preferences";

export function toggleAmountsHidden() {
  savePreferences({ amountsHidden: !readPreferences().amountsHidden });
}

export function useAmountsHidden() {
  return usePreferences().amountsHidden;
}
