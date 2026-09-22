import type { HouseholdRole } from "@/api/generated/model";
import type { Translate } from "@/lib/i18n";

export function householdRoleOptions(t: Translate, roles: readonly HouseholdRole[]) {
  return roles.map((role) => ({ value: role, label: t(`households.roles.${role}`) }));
}
