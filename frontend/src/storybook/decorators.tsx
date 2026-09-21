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
import { toast } from "sonner";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RoutePending } from "@/components/route-pending/route-pending";
import { Toaster } from "@/components/ui/sonner/sonner";
import { TooltipProvider } from "@/components/ui/tooltip/tooltip";
import { setAuthenticated, setSetupNeeded } from "@/lib/auth-gate";
import { pageViewTransition } from "@/lib/page-transition";
import { createToastingMutationCache } from "@/lib/query-client";
import { routeTree } from "@/route-tree.gen";
import { accountsSearchSchema } from "@/routes/accounts";
import { investmentsSearchSchema } from "@/routes/investments";
import { profileSearchSchema } from "@/routes/profile";
import { reportsSearchSchema } from "@/routes/reports";
import { resetPasswordSearchSchema } from "@/routes/reset-password";
import { settingsSearchSchema } from "@/routes/settings";
import { transactionsSearchSchema } from "@/routes/transactions";
import { usersSearchSchema } from "@/routes/users";
import { verifyEmailSearchSchema } from "@/routes/verify-email";
import { clearTransactionViews } from "@/stores/transaction-views";

const STORY_ROUTES = [
  { path: "/" },
  { path: "/accounts", validateSearch: accountsSearchSchema },
  { path: "/transactions", validateSearch: transactionsSearchSchema },
  { path: "/investments", validateSearch: investmentsSearchSchema },
  { path: "/reports", validateSearch: reportsSearchSchema },
  { path: "/users", validateSearch: usersSearchSchema },
  { path: "/budgets" },
  { path: "/categories" },
  { path: "/goals" },
  { path: "/households" },
  { path: "/net-worth" },
  { path: "/profile", validateSearch: profileSearchSchema },
  { path: "/recurring-bills" },
  { path: "/settings", validateSearch: settingsSearchSchema },
  { path: "/login" },
  { path: "/setup" },
  { path: "/forgot-password" },
  { path: "/reset-password", validateSearch: resetPasswordSearchSchema },
  { path: "/verify-email", validateSearch: verifyEmailSearchSchema },
] as const;

const STORY_WIDTHS = {
  field: "w-72",
  card: "w-80",
  form: "w-[min(32rem,calc(100vw-3rem))]",
  panel: "w-[min(40rem,90vw)]",
  wide: "w-[min(48rem,calc(100vw-3rem))]",
} as const;

type StoryWidth = keyof typeof STORY_WIDTHS;

function isStoryWidth(size: string): size is StoryWidth {
  return size in STORY_WIDTHS;
}

export function withWidth(size: StoryWidth | (string & {})): Decorator {
  const className = isStoryWidth(size) ? STORY_WIDTHS[size] : size;
  return function withStoryWidth(Story) {
    return (
      <div className={className}>
        <Story />
      </div>
    );
  };
}

export function withPageFrame(...[Story]: Parameters<Decorator>) {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <QueryBoundary fallback={<RoutePending />}>
        <Story />
      </QueryBoundary>
    </div>
  );
}

const storyQueryClients = new Set<QueryClient>();

function createStoryQueryClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
    mutationCache: createToastingMutationCache(),
  });
  storyQueryClients.add(client);
  return client;
}

export function disposeStoryState() {
  for (const client of storyQueryClients) {
    client.clear();
  }
  storyQueryClients.clear();
  clearTransactionViews();
  toast.dismiss();
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
        <RouterProvider router={router} />
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

function storyRoute(route: unknown) {
  return typeof route === "string" ? route : "/";
}

export function withAppProviders(...[Story, context]: Parameters<Decorator>) {
  return context.parameters.providers === "none" ? (
    <Story />
  ) : (
    <StoryProviders Story={Story} initialPath={storyRoute(context.parameters.route)} />
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
      context: { queryClient },
      history: createMemoryHistory({ initialEntries: [path] }),
      defaultViewTransition: pageViewTransition,
    });
  });

  return <ProviderTree queryClient={queryClient} router={router} />;
}
