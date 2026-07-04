import { Store } from "@tanstack/store";
import { useSelector } from "@tanstack/react-store";

const STORAGE_KEY = "jx-sidebar-collapsed";

function resolveInitialCollapsed(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

const sidebarStore = new Store<{ collapsed: boolean }>({
  collapsed: resolveInitialCollapsed(),
});

export function toggleSidebar() {
  sidebarStore.setState((state) => {
    const collapsed = !state.collapsed;
    localStorage.setItem(STORAGE_KEY, String(collapsed));
    return { ...state, collapsed };
  });
}

export function useSidebarCollapsed() {
  const collapsed = useSelector(sidebarStore, (state) => state.collapsed);
  return { collapsed, toggleSidebar };
}
