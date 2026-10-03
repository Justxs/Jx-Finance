import { HttpResponse } from "msw";
import { NotificationType } from "@/api/generated/model";
import type { UserProfileResponse } from "@/api/generated/model";
import {
  getCreateUserMockHandler,
  getDeactivateUserMockHandler,
  getExportMyDataMockHandler,
  getImportMyDataMockHandler,
  getReactivateUserMockHandler,
  getResetUserPasswordMockHandler,
  getUpdateMyDigestScopesMockHandler,
  getUpdateMyDiscordNotificationsMockHandler,
  getUpdateMyTelegramNotificationsMockHandler,
  getUsersMockHandler,
  getUpdateMyEmailNotificationsMockHandler,
  getUpdateMyLanguageMockHandler,
  getUpdateMyProfileMockHandler,
  getUpdateUserRoleMockHandler,
} from "@/api/generated/users/users.msw";
import {
  adminPassword,
  currentUser,
  memberImportResult,
  userProfile,
  users,
  wrongAdminPasswordProblem,
} from "@/storybook/fixtures";
import { found, onRouteOf, problem, query, readBody, text } from "./http";
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
  getUsersMockHandler(({ request }) => filterUsers(query(request))),
  getCreateUserMockHandler(async ({ request }) => {
    const base = userProfile({
      id: NEW_USER_ID,
      email: "",
      displayName: "",
      emailConfirmed: false,
    });
    return mergeProfile(base, await readBody(request));
  }),
  getUpdateMyProfileMockHandler(async ({ request }) => {
    const body = await readBody(request);
    return mergeProfile(currentUser, { displayName: body.displayName });
  }),
  getUpdateMyEmailNotificationsMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const chosen: unknown[] = Array.isArray(body.types) ? body.types : [];
    return {
      ...currentUser,
      emailNotificationTypes: Object.values(NotificationType).filter((kind) =>
        chosen.includes(kind),
      ),
    };
  }),
  getUpdateMyDiscordNotificationsMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const chosen: unknown[] = Array.isArray(body.types) ? body.types : [];
    return {
      ...currentUser,
      discordNotificationTypes: Object.values(NotificationType).filter((kind) =>
        chosen.includes(kind),
      ),
    };
  }),
  getUpdateMyTelegramNotificationsMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const chosen: unknown[] = Array.isArray(body.types) ? body.types : [];
    return {
      ...currentUser,
      telegramNotificationTypes: Object.values(NotificationType).filter((kind) =>
        chosen.includes(kind),
      ),
    };
  }),
  getUpdateMyLanguageMockHandler(async ({ request }) => ({
    ...currentUser,
    language: text((await readBody(request)).language) ?? null,
  })),
  getUpdateMyDigestScopesMockHandler(async ({ request }) => {
    const body = await readBody(request);
    return {
      ...currentUser,
      monthlyDigestEverything: body.everything === true,
      monthlyDigestHouseholdIds: Array.isArray(body.householdIds)
        ? body.householdIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  }),
  getDeactivateUserMockHandler(),
  getReactivateUserMockHandler(),
  getResetUserPasswordMockHandler(async ({ params, request }) => {
    const user = found(byId(users, params.id));
    const body = await readBody(request);
    if (text(body.currentPassword) !== adminPassword) {
      throw problem(wrongAdminPasswordProblem);
    }
    return {
      ...user,
      twoFactorEnabled: body.resetTwoFactor === true ? false : user.twoFactorEnabled,
    };
  }),
  getUpdateUserRoleMockHandler(async ({ params, request }) => {
    const user = found(byId(users, params.id));
    const body = await readBody(request);
    return mergeProfile(user, { role: body.role });
  }),
  getImportMyDataMockHandler(memberImportResult),
  onRouteOf(getExportMyDataMockHandler(new Blob()), () =>
    HttpResponse.arrayBuffer(
      new Uint8Array([0x50, 0x4b, 0x05, 0x06, ...Array.from({ length: 18 }, () => 0)]).buffer,
      {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="jx-finance-export-2026-09-18.zip"',
        },
      },
    ),
  ),
];
