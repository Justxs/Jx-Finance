import { Store, useSelector } from "@tanstack/react-store";
import {
  COMMAND_RECENTS_MAX,
  readPreferences,
  savePreferences,
  usePreferences,
} from "./preferences";

const commandPaletteStore = new Store<{ open: boolean }>({ open: false });

export function setCommandPaletteOpen(open: boolean) {
  commandPaletteStore.setState((state) => ({ ...state, open }));
}

export function toggleCommandPalette() {
  commandPaletteStore.setState((state) => ({ ...state, open: !state.open }));
}

export function isCommandPaletteOpen() {
  return commandPaletteStore.state.open;
}

export function useCommandPaletteOpen() {
  const open = useSelector(commandPaletteStore, (state) => state.open);
  return { open, setOpen: setCommandPaletteOpen };
}

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
