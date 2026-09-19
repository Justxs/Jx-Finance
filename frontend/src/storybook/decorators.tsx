import type { Decorator } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  type AnyRouter,
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { type FunctionComponent, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthenticated, setSetupNeeded } from "@/lib/auth-gate";
import { pageViewTransition } from "@/lib/page-transition";
import { routeTree } from "@/route-tree.gen";
import { accountsSearchSchema } from "@/routes/accounts";
import { importSearchSchema } from "@/routes/import";
import { investmentsSearchSchema } from "@/routes/investments";
import { reportsSearchSchema } from "@/routes/reports";
import { transactionsSearchSchema } from "@/routes/transactions";
import { usersSearchSchema } from "@/routes/users";

const STORY_ROUTES = [
  { path: "/" },
  { path: "/accounts", validateSearch: accountsSearchSchema },
  { path: "/transactions", validateSearch: transactionsSearchSchema },
  { path: "/import", validateSearch: importSearchSchema },
  { path: "/investments", validateSearch: investmentsSearchSchema },
  { path: "/reports", validateSearch: reportsSearchSchema },
  { path: "/users", validateSearch: usersSearchSchema },
  { path: "/budgets" },
  { path: "/categories" },
  { path: "/goals" },
  { path: "/households" },
  { path: "/net-worth" },
  { path: "/profile" },
  { path: "/recurring-bills" },
  { path: "/settings" },
  { path: "/login" },
  { path: "/setup" },
] as const;

function createStoryQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
}

function createStoryRouter(Story: FunctionComponent, initialPath: string) {
  const rootRoute = createRootRoute({ component: Outlet });
  const children = STORY_ROUTES.map((route) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path: route.path,
      validateSearch: "validateSearch" in route ? route.validateSearch : undefined,
      component: Story,
    }),
  );

  return createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

function ProviderTree({
  queryClient,
  router,
}: Readonly<{ queryClient: QueryClient; router: AnyRouter }>) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router as never} />
      </TooltipProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

function StoryProviders({
  Story,
  initialPath,
}: Readonly<{ Story: FunctionComponent; initialPath: string }>) {
  const [queryClient] = useState(createStoryQueryClient);
  const [router] = useState(() => createStoryRouter(Story, initialPath));

  return <ProviderTree queryClient={queryClient} router={router} />;
}

export function withAppProviders(...[Story, context]: Parameters<Decorator>) {
  return context.parameters.providers === "none" ? (
    <Story />
  ) : (
    <StoryProviders Story={Story} initialPath={(context.parameters.route as string) ?? "/"} />
  );
}

export function AppAt({
  path,
  authenticated = true,
  needsSetup = false,
}: Readonly<{ path: string; authenticated?: boolean; needsSetup?: boolean }>) {
  const [queryClient] = useState(createStoryQueryClient);
  const [router] = useState(() => {
    setSetupNeeded(needsSetup);
    setAuthenticated(authenticated);
    return createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: [path] }),
      defaultViewTransition: pageViewTransition,
    });
  });

  return <ProviderTree queryClient={queryClient} router={router} />;
}
