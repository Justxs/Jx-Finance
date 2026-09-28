import type { QueryClient } from "@tanstack/react-query";
import {
  getHouseholdsSuspenseQueryOptions,
  getMeSuspenseQueryOptions,
  getNotificationsSuspenseQueryOptions,
} from "@/api/generated";
import type { NotificationsParams } from "@/api/generated/model";
import { settingsQueryOptions } from "@/hooks/use-settings";
import { warm } from "@/lib/route-prefetch";

export const unreadParams: NotificationsParams = { unread: true };

export function warmAppShell(queryClient: QueryClient) {
  warm(queryClient, settingsQueryOptions());
  warm(queryClient, getMeSuspenseQueryOptions());
  warm(queryClient, getNotificationsSuspenseQueryOptions(unreadParams));
  warm(queryClient, getHouseholdsSuspenseQueryOptions());
}

export async function loadAppShell(queryClient: QueryClient) {
  await Promise.allSettled([
    queryClient.query(settingsQueryOptions()),
    queryClient.query(getMeSuspenseQueryOptions()),
    queryClient.query(getNotificationsSuspenseQueryOptions(unreadParams)),
    queryClient.query(getHouseholdsSuspenseQueryOptions()),
  ]);
}
