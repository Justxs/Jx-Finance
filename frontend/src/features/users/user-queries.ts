import type { UsersParams } from "@/api/generated/model";
import type { Translate } from "@/lib/i18n";
import { UserRole } from "@/lib/user-role";

interface NamedUser {
  displayName: string;
  email: string;
}

export const userRoles = [UserRole.member, UserRole.admin] as const;

export function userListParams(search: UsersParams): UsersParams {
  return {
    search: search.search,
    role: search.role,
    isActive: search.isActive,
    sort: search.sort,
    direction: search.direction,
  };
}

export function roleOptions(t: Translate) {
  return userRoles.map((role) => ({ value: role, label: t(`users.roles.${role}`) }));
}

export function userName(user: NamedUser) {
  return user.displayName || user.email;
}
