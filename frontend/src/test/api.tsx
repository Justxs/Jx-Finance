import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  type AnyValidator,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { configure, render } from "@testing-library/react";
import type { RequestHandler } from "msw";
import { setupServer } from "msw/node";
import type { ReactElement } from "react";
import { toast } from "sonner";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Toaster } from "@/components/ui/sonner/sonner";
import { TooltipProvider } from "@/components/ui/tooltip/tooltip";
import { createMutationCache } from "@/lib/query-client";
import { handlers } from "@/storybook/handlers";

const clients = new Set<QueryClient>();

configure({ asyncUtilTimeout: 3_000 });
vi.setConfig({ testTimeout: 10_000 });

export function mockApi() {
  const server = setupServer(...handlers);
  const requests: Request[] = [];
  server.events.on("request:start", ({ request }) => {
    requests.push(request.clone());
  });

  beforeAll(() => {
    server.listen({ onUnhandledFrame: "error" });
  });
  afterEach(() => {
    server.resetHandlers();
    requests.length = 0;
    for (const client of clients) {
      client.clear();
    }
    clients.clear();
    toast.dismiss();
  });
  afterAll(() => {
    server.close();
  });

  function use(...overrides: RequestHandler[]) {
    server.use(...overrides);
  }

  function sent(method: string, pathname: string) {
    return requests.filter(
      (request) => request.method === method && new URL(request.url).pathname === pathname,
    );
  }

  async function lastBody(method: string, pathname: string): Promise<unknown> {
    return sent(method, pathname).at(-1)?.json();
  }

  return { use, sent, lastBody };
}

interface AppOptions {
  path?: string;
  validateSearch?: AnyValidator;
}

function Blank() {
  return null;
}

export function renderInApp(ui: ReactElement, { path = "/", validateSearch }: AppOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
    mutationCache: createMutationCache(),
  });
  clients.add(queryClient);

  function Screen() {
    return <QueryBoundary fallback={null}>{ui}</QueryBoundary>;
  }

  const rootRoute = createRootRoute({ component: Screen });
  const page = createRoute({
    getParentRoute: () => rootRoute,
    path: new URL(path, "http://localhost").pathname,
    validateSearch,
    component: Blank,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([page]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
      <Toaster />
    </QueryClientProvider>,
  );
  return { ...view, queryClient, router };
}
