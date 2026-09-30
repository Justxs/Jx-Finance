import { useSettings } from "@/hooks/use-settings";
import { visibleNav } from "@/lib/navigation";
import { UserRole } from "@/lib/user-role";

export function useVisibleNav(role: string | undefined, enabled = true) {
  return visibleNav(useSettings({ enabled }).features, role === UserRole.admin);
}
