import type { FetchQueryOptions, QueryClient, QueryKey } from "@tanstack/react-query";
import type { SettingsResponse } from "@/api/generated/model";
import { settingsQueryOptions } from "@/hooks/use-settings";
import { parseIso, todayInZone } from "@/lib/calendar";

export interface RouterContext {
  queryClient: QueryClient;
}

export const WARM_STALE_TIME = Infinity;

export function warm<TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
  queryClient: QueryClient,
  options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
) {
  void queryClient.prefetchQuery({
    ...options,
    staleTime: options.staleTime ?? WARM_STALE_TIME,
  });
}

function ignoreFailure() {
  return undefined;
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
  void queryClient.ensureQueryData(options).then(run, ignoreFailure);
}

export function todayDateIn(settings: SettingsResponse): Date {
  return parseIso(todayInZone(settings.timeZone)) ?? new Date();
}
