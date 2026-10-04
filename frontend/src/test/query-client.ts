import { type MutationCache, QueryClient } from "@tanstack/react-query";

interface TestQueryClientOptions {
  staleTime?: number;
  mutationCache?: MutationCache;
}

export function testQueryClient({
  staleTime = Infinity,
  mutationCache,
}: TestQueryClientOptions = {}) {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime } },
    mutationCache,
  });
}
