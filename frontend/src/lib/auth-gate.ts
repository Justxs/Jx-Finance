import type { QueryClient } from "@tanstack/react-query";
import { getMeQueryOptions } from "@/api/generated";
import type { UserProfileResponse } from "@/api/generated/model";
import { SetupStatusResponse } from "@/api/schemas/setup/setup.zod";
import { UserRole } from "@/lib/user-role";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

let setupNeededCache: boolean | null = null;
let authenticatedCache: boolean | null = null;

export function setSetupNeeded(value: boolean) {
  setupNeededCache = value;
}

export function setAuthenticated(value: boolean) {
  authenticatedCache = value;
}

export async function checkSetupNeeded(): Promise<boolean> {
  if (setupNeededCache !== null) {
    return setupNeededCache;
  }

  try {
    const response = await fetch(`${baseUrl}/api/setup/status`, { credentials: "include" });
    const body = SetupStatusResponse.parse(await response.json());
    setupNeededCache = body.needsSetup;
    return setupNeededCache;
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
