import { openStore } from "./open-store";

export const {
  setOpen: setShortcutsHelpOpen,
  toggle: toggleShortcutsHelp,
  isOpen: isShortcutsHelpOpen,
  useOpen: useShortcutsHelpOpen,
} = openStore();
