import type { QueryClient, QueryExecuteOptions, QueryKey } from "@tanstack/react-query";
import {
  getHouseholdsSuspenseQueryOptions,
  getMeSuspenseQueryOptions,
  getNotificationsSuspenseQueryOptions,
} from "@/api/generated";
import type { NotificationsParams } from "@/api/generated/model";
import { warm } from "@/lib/route-prefetch";
import { settingsQueryOptions } from "@/lib/settings";

export const unreadParams: NotificationsParams = { unread: true };

type ShellQuery = <TQueryFnData, TError, TData, TQueryData, TQueryKey extends QueryKey>(
  options: QueryExecuteOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
) => unknown;

function eachShellQuery(run: ShellQuery) {
  return [
    run(settingsQueryOptions()),
    run(getMeSuspenseQueryOptions()),
    run(getNotificationsSuspenseQueryOptions(unreadParams)),
    run(getHouseholdsSuspenseQueryOptions()),
  ];
}

export function warmAppShell(queryClient: QueryClient) {
  eachShellQuery((options) => warm(queryClient, options));
}

export async function loadAppShell(queryClient: QueryClient) {
  await Promise.allSettled(eachShellQuery((options) => queryClient.query(options)));
}
