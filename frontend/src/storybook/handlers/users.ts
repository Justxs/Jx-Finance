import type { UserProfileResponse } from "@/api/generated/model";
import {
  getCreateUserMockHandler,
  getDeactivateUserMockHandler,
  getUsersMockHandler,
  getUpdateMyProfileMockHandler,
  getUpdateUserRoleMockHandler,
} from "@/api/generated/users/users.msw";
import { currentUser, users } from "@/storybook/fixtures";
import { found, readBody, text } from "./http";
import type { Body } from "./http";
import { NEW_USER_ID } from "./ids";
import { applyDirection, byId, compareText, includesText } from "./lists";

function filterUsers(params: URLSearchParams): UserProfileResponse[] {
  const search = params.get("search");
  const role = params.get("role");
  const isActive = params.get("isActive");
  const sort = params.get("sort");
  const filtered = users.filter(
    (item) =>
      (!search || includesText(item.displayName, search) || includesText(item.email, search)) &&
      (!role || item.role === role) &&
      (isActive === null || isActive === "" || String(item.isActive) === isActive),
  );
  if (!sort) {
    return filtered;
  }
  const sorted = filtered.toSorted((a, b) => {
    switch (sort) {
      case "email":
        return compareText(a.email, b.email);
      case "role":
        return compareText(a.role, b.role);
      case "status":
        return Number(b.isActive) - Number(a.isActive);
      default:
        return compareText(a.displayName, b.displayName);
    }
  });
  return applyDirection(sorted, params, "asc");
}

export function mergeProfile(base: UserProfileResponse, body: Body): UserProfileResponse {
  return {
    ...base,
    email: text(body.email) ?? base.email,
    displayName: text(body.displayName) ?? base.displayName,
    role: text(body.role) ?? base.role,
  };
}

export const userHandlers = [
  getUsersMockHandler(({ request }) => filterUsers(new URL(request.url).searchParams)),
  getCreateUserMockHandler(async ({ request }) => {
    const base: UserProfileResponse = {
      id: NEW_USER_ID,
      email: "",
      displayName: "",
      role: "Member",
      twoFactorEnabled: false,
      isActive: true,
    };
    return mergeProfile(base, await readBody(request));
  }),
  getUpdateMyProfileMockHandler(async ({ request }) => {
    const body = await readBody(request);
    return mergeProfile(currentUser, { displayName: body.displayName });
  }),
  getDeactivateUserMockHandler(),
  getUpdateUserRoleMockHandler(async ({ params, request }) => {
    const user = found(byId(users, params.id));
    const body = await readBody(request);
    return mergeProfile(user, { role: body.role });
  }),
];
