import type { QueryClient } from "@tanstack/react-query";
import {
  getMeQueryOptions,
  getSetupStatusQueryKey,
  getSetupStatusSuspenseQueryOptions,
} from "@/api/generated";
import type { UserProfileResponse } from "@/api/generated/model";
import { UserRole } from "@/lib/user-role";
import { forgetUserPreferences } from "@/stores/preferences";

let authenticatedCache: boolean | null = null;

export function setSetupNeeded(queryClient: QueryClient, needsSetup: boolean) {
  queryClient.setQueryData(getSetupStatusQueryKey(), { needsSetup });
}

export function setAuthenticated(value: boolean) {
  authenticatedCache = value;
}

export function hasSession() {
  return authenticatedCache === true;
}

export function endSession(
  queryClient: QueryClient,
  navigate: (options: { to: "/login" }) => unknown,
) {
  setAuthenticated(false);
  forgetUserPreferences();
  queryClient.clear();
  void navigate({ to: "/login" });
}

export async function checkSetupNeeded(queryClient: QueryClient): Promise<boolean> {
  try {
    const status = await queryClient.query({
      ...getSetupStatusSuspenseQueryOptions(),
      staleTime: "static",
    });
    return status.needsSetup;
  } catch {
    return false;
  }
}

async function loadMe(queryClient: QueryClient): Promise<UserProfileResponse | null> {
  try {
    return await queryClient.query({ ...getMeQueryOptions(), staleTime: "static" });
  } catch {
    return null;
  }
}

export async function checkIsAuthenticated(queryClient: QueryClient): Promise<boolean> {
  if (authenticatedCache !== null) {
    return authenticatedCache;
  }

  authenticatedCache = (await loadMe(queryClient)) !== null;
  return authenticatedCache;
}

export async function checkIsAdmin(queryClient: QueryClient): Promise<boolean> {
  const me = await loadMe(queryClient);
  return me?.role === UserRole.admin;
}
