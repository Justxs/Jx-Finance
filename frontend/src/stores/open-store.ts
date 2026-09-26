import { Store, useSelector } from "@tanstack/react-store";

export function openStore() {
  const store = new Store(false);

  function setOpen(open: boolean) {
    store.setState(() => open);
  }

  function toggle() {
    store.setState((open) => !open);
  }

  function isOpen() {
    return store.state;
  }

  function useOpen() {
    const open = useSelector(store, (state) => state);
    return { open, setOpen };
  }

  return { setOpen, toggle, isOpen, useOpen };
}
