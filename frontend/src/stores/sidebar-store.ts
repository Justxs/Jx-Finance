import { readPreferences, savePreferences, usePreferences } from "./preferences";

export function toggleSidebar() {
  savePreferences({ sidebarCollapsed: !readPreferences().sidebarCollapsed });
}

export function setSidebarCollapsed(sidebarCollapsed: boolean) {
  savePreferences({ sidebarCollapsed });
}

export function useSidebarCollapsed() {
  const collapsed = usePreferences().sidebarCollapsed;
  return { collapsed, toggleSidebar };
}
