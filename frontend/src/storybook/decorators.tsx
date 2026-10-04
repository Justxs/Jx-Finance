import type { Decorator } from "@storybook/react-vite";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  type AnyRoute,
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
import { TransactionAmount } from "@/components/transaction-amount/transaction-amount";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { Toaster } from "@/components/ui/sonner/sonner";
import { TooltipProvider } from "@/components/ui/tooltip/tooltip";
import { transactionsSearchSchema } from "@/features/transactions/transaction-queries";
import { clearTransactionViews } from "@/features/transactions/transaction-views";
import { setAuthenticated, setSetupNeeded } from "@/lib/auth-gate";
import { pageViewTransition } from "@/lib/page-transition";
import { createMutationCache } from "@/lib/query-client";
import { emailTokenSearchSchema } from "@/lib/search-schema";
import { routeTree } from "@/route-tree.gen";
import { accountsSearchSchema } from "@/routes/accounts";
import { dashboardSearchSchema } from "@/routes/index";
import { investmentsSearchSchema } from "@/routes/investments";
import { profileSearchSchema } from "@/routes/profile";
import { recurringBillsSearchSchema } from "@/routes/recurring-bills";
import { reportsSearchSchema } from "@/routes/reports";
import { monthPageSearchSchema } from "@/routes/reports_.month";
import { settingsSearchSchema } from "@/routes/settings";
import { usersSearchSchema } from "@/routes/users";
import { longDescriptionTransaction } from "@/storybook/fixtures";
import { testQueryClient } from "@/test/query-client";

const STORY_ROUTES = [
  { path: "/", validateSearch: dashboardSearchSchema },
  { path: "/accounts", validateSearch: accountsSearchSchema },
  { path: "/transactions", validateSearch: transactionsSearchSchema },
  { path: "/investments", validateSearch: investmentsSearchSchema },
  { path: "/reports", validateSearch: reportsSearchSchema },
  { path: "/reports/month", validateSearch: monthPageSearchSchema },
  { path: "/users", validateSearch: usersSearchSchema },
  { path: "/budgets" },
  { path: "/categories" },
  { path: "/tags" },
  { path: "/categorization-rules" },
  { path: "/goals" },
  { path: "/households" },
  { path: "/net-worth" },
  { path: "/net-worth/assets/$assetId" },
  { path: "/net-worth/debts/$debtId" },
  { path: "/profile", validateSearch: profileSearchSchema },
  { path: "/recurring-bills", validateSearch: recurringBillsSearchSchema },
  { path: "/settings", validateSearch: settingsSearchSchema },
  { path: "/welcome" },
  { path: "/features" },
  { path: "/login" },
  { path: "/setup" },
  { path: "/forgot-password" },
  { path: "/reset-password", validateSearch: emailTokenSearchSchema },
  { path: "/verify-email", validateSearch: emailTokenSearchSchema },
] as const;

const STORY_WIDTHS = {
  auth: "flex w-96 max-w-full justify-center",
  narrow: "w-[min(16rem,90vw)]",
  field: "w-72",
  card: "w-80",
  column: "w-[min(28rem,90vw)]",
  form: "w-[min(32rem,calc(100vw-3rem))]",
  dialog: "w-[min(36rem,calc(100vw-3rem))]",
  panel: "w-[min(40rem,90vw)]",
  wide: "w-[min(48rem,calc(100vw-3rem))]",
  full: "w-[min(64rem,calc(100vw-3rem))]",
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

export const SAMPLE_AMOUNT = "−€249.00";

export function withSampleAmount(...[Story]: Parameters<Decorator>) {
  return (
    <div className="flex flex-col items-start gap-4">
      <TransactionAmount transaction={longDescriptionTransaction} />
      <Story />
    </div>
  );
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
  const client = testQueryClient({ mutationCache: createMutationCache() });
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

function BoundedStory({ Story }: Readonly<{ Story: FunctionComponent }>) {
  return (
    <QueryBoundary fallback={<Skeleton className="h-40 w-full min-w-72" />}>
      <Story />
    </QueryBoundary>
  );
}

const appRoutes: readonly AnyRoute[] = Object.values(routeTree.children ?? {});

function appPending(path: string) {
  return appRoutes.find((route) => "path" in route.options && route.options.path === path)?.options
    .pendingComponent;
}

function createStoryRouter(Story: FunctionComponent, initialPath: string, bounded: boolean) {
  function StoryRoute() {
    return bounded ? <BoundedStory Story={Story} /> : <Story />;
  }

  const rootRoute = createRootRoute({ component: Outlet });
  const children = STORY_ROUTES.map((route) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path: route.path,
      validateSearch: "validateSearch" in route ? route.validateSearch : undefined,
      component: StoryRoute,
      pendingComponent: appPending(route.path),
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
  bounded,
}: Readonly<{ Story: FunctionComponent; initialPath: string; bounded: boolean }>) {
  const [queryClient] = useState(createStoryQueryClient);
  const [router] = useState(() => createStoryRouter(Story, initialPath, bounded));

  return <ProviderTree queryClient={queryClient} router={router} />;
}

function storyRoute(route: unknown) {
  return typeof route === "string" ? route : "/";
}

export function withAppProviders(...[Story, context]: Parameters<Decorator>) {
  return context.parameters.providers === "none" ? (
    <Story />
  ) : (
    <StoryProviders
      Story={Story}
      initialPath={storyRoute(context.parameters.route)}
      bounded={context.parameters.boundary !== false}
    />
  );
}

export function AppAt({
  path,
  authenticated = true,
  needsSetup = false,
}: Readonly<{ path: string; authenticated?: boolean; needsSetup?: boolean }>) {
  const [queryClient] = useState(createStoryQueryClient);
  const [router] = useState(() => {
    setSetupNeeded(queryClient, needsSetup);
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
