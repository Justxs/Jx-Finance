import { QueryClient } from "@tanstack/react-query";

// Shared TanStack Query client. refetchOnWindowFocus keeps multi-device data fresh.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
