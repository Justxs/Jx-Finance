import type { HouseholdRole } from "@/api/generated/model";
import type { Translate } from "@/lib/i18n";
import { optionsOf } from "@/lib/options";

export function householdRoleOptions(t: Translate, roles: readonly HouseholdRole[]) {
  return optionsOf(roles, (role) => t(`households.roles.${role}`));
}
