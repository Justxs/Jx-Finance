import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

const shortcutsHelpStore = new Store<{ open: boolean }>({ open: false });

export function setShortcutsHelpOpen(open: boolean) {
  shortcutsHelpStore.setState((state) => ({ ...state, open }));
}

export function toggleShortcutsHelp() {
  shortcutsHelpStore.setState((state) => ({ ...state, open: !state.open }));
}

export function isShortcutsHelpOpen() {
  return shortcutsHelpStore.state.open;
}

export function useShortcutsHelpOpen() {
  const open = useSelector(shortcutsHelpStore, (state) => state.open);
  return { open, setOpen: setShortcutsHelpOpen };
}
