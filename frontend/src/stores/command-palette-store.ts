import { openStore } from "./open-store";
import {
  COMMAND_RECENTS_MAX,
  readPreferences,
  savePreferences,
  usePreferences,
} from "./preferences";

export const {
  setOpen: setCommandPaletteOpen,
  toggle: toggleCommandPalette,
  isOpen: isCommandPaletteOpen,
  useOpen: useCommandPaletteOpen,
} = openStore();

const NO_RECENTS: readonly string[] = [];

export function readCommandRecents(): readonly string[] {
  return readPreferences().commandRecents ?? NO_RECENTS;
}

export function rememberCommand(id: string) {
  const kept = readCommandRecents().filter((recent) => recent !== id);
  savePreferences({ commandRecents: [id, ...kept].slice(0, COMMAND_RECENTS_MAX) });
}

export function useCommandRecents(): readonly string[] {
  return usePreferences().commandRecents ?? NO_RECENTS;
}
