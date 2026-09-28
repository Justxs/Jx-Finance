import { savePreferences, usePreferences } from "./preferences";

export function hideMonthClosePrompt(month: string) {
  savePreferences({ monthClosePromptHidden: month });
}

export function useMonthClosePromptHidden(month: string) {
  return usePreferences().monthClosePromptHidden === month;
}
