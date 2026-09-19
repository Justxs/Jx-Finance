import type { UsersParams } from "@/api/generated/model";

export function userListParams(search: UsersParams): UsersParams {
  return {
    search: search.search,
    role: search.role,
    isActive: search.isActive,
    sort: search.sort,
    direction: search.direction,
  };
}
