import { useLiveQuery } from "@tanstack/react-db";
import { z } from "zod";
import { localCollection } from "./local-collection";

export const PREFERENCES_STORAGE_KEY = "jx-preferences";

const ROW_ID = "browser";

const themes = ["light", "dark"] as const;
export const palettes = ["ledger", "plum", "sepia", "graphite"] as const;
export const fonts = [
  "ledger",
  "sans",
  "serif",
  "system",
  "inter",
  "hyperlegible",
  "plex",
  "editorial",
] as const;
export const textSizes = ["small", "default", "large"] as const;
export const locales = ["en", "lt"] as const;

export const DEFAULT_PALETTE = "ledger";
export const DEFAULT_FONT = "ledger";
export const DEFAULT_TEXT_SIZE = "default";

export const COMMAND_RECENTS_MAX = 8;

const preferencesSchema = z.object({
  id: z.literal(ROW_ID),
  theme: z.enum(themes).optional().catch(undefined),
  palette: z.enum(palettes).catch(DEFAULT_PALETTE),
  font: z.enum(fonts).catch(DEFAULT_FONT),
  textSize: z.enum(textSizes).catch(DEFAULT_TEXT_SIZE),
  sidebarCollapsed: z.boolean().catch(false),
  locale: z.enum(locales).optional().catch(undefined),
  activeHouseholdId: z.uuid().optional().catch(undefined),
  commandRecents: z.array(z.string()).max(COMMAND_RECENTS_MAX).optional().catch(undefined),
});

export type Preferences = z.output<typeof preferencesSchema>;
type PreferencesPatch = Partial<Omit<Preferences, "id">>;

export const preferencesCollection = localCollection(
  "preferences",
  PREFERENCES_STORAGE_KEY,
  preferencesSchema,
);

function parsedPreferences(row: Preferences | undefined): Preferences {
  return preferencesSchema.parse({ ...row, id: ROW_ID });
}

export function readPreferences(): Preferences {
  return parsedPreferences(preferencesCollection.get(ROW_ID));
}

export function savePreferences(patch: PreferencesPatch) {
  if (preferencesCollection.has(ROW_ID)) {
    preferencesCollection.update(ROW_ID, (draft) => {
      Object.assign(draft, patch);
    });
  } else {
    preferencesCollection.insert({ ...readPreferences(), ...patch });
  }
}

export function onPreferencesChange(listener: () => void) {
  const subscription = preferencesCollection.subscribeChanges(listener);
  return () => subscription.unsubscribe();
}

export function usePreferences(): Preferences {
  return parsedPreferences(useLiveQuery(preferencesCollection).state.get(ROW_ID));
}
