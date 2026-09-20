import type { QueryClient, QueryExecuteOptions, QueryKey } from "@tanstack/react-query";
import { noop } from "@tanstack/react-query";
import type { SettingsResponse } from "@/api/generated/model";
import { settingsQueryOptions } from "@/hooks/use-settings";
import { parseIso, todayInZone } from "@/lib/calendar";

export interface RouterContext {
  queryClient: QueryClient;
}

const WARM_STALE_TIME = Infinity;

export function warm<TQueryFnData, TError, TData, TQueryData, TQueryKey extends QueryKey>(
  queryClient: QueryClient,
  options: QueryExecuteOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
) {
  void queryClient
    .query({
      ...options,
      staleTime: options.staleTime ?? WARM_STALE_TIME,
    })
    .catch(noop);
}

export function warmWithSettings(
  queryClient: QueryClient,
  run: (settings: SettingsResponse) => void,
) {
  const options = settingsQueryOptions();
  const cached = queryClient.getQueryData(options.queryKey);
  if (cached) {
    run(cached);
    return;
  }
  void queryClient.query({ ...options, staleTime: "static" }).then(run, noop);
}

export function todayDateIn(settings: SettingsResponse): Date {
  return parseIso(todayInZone(settings.timeZone)) ?? new Date();
}
