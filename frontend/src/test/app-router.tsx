import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { render, waitFor } from "@testing-library/react";
import { expect } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip/tooltip";
import { setSetupNeeded } from "@/lib/auth-gate";
import { routeTree } from "@/route-tree.gen";

export const APP_TEST_TIMEOUT = 30_000;

export const appWait = { timeout: 15_000 };

export function mountApp(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  setSetupNeeded(queryClient, false);
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return { queryClient, router };
}

export async function settled(queryClient: QueryClient) {
  await waitFor(() => expect(queryClient.isFetching()).toBe(0), appWait);
}
