import {
  Link,
  Outlet,
  createRootRouteWithContext,
  redirect,
  useLocation,
  useRouterState,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getMeSuspenseQueryOptions, useMe } from "@/api/generated";
import {
  AppSidebar,
  AppSidebarFallback,
  AppSidebarSkeleton,
} from "@/components/app-sidebar/app-sidebar";
import { MobileNav } from "@/components/app-sidebar/mobile-nav";
import { Brand } from "@/components/brand/brand";
import { LanguageToggle } from "@/components/language-toggle/language-toggle";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RouteError } from "@/components/route-error/route-error";
import { RoutePending } from "@/components/route-pending/route-pending";
import { ShortcutsHelp } from "@/components/shortcuts-help/shortcuts-help";
import { Splash } from "@/components/splash/splash";
import { ThemeToggle } from "@/components/theme-toggle/theme-toggle";
import { TornEdge } from "@/components/torn-edge/torn-edge";
import { CommandPalette } from "@/features/command-palette/command-palette/command-palette";
import { EmailVerificationBanner } from "@/features/profile/email-verification-banner/email-verification-banner";
import { DemoDataBanner } from "@/features/settings/demo-data-banner/demo-data-banner";
import { usePublicSettings } from "@/hooks/use-settings";
import { useVisibleNav } from "@/hooks/use-visible-nav";
import { warmAppShell } from "@/lib/app-shell";
import { checkGuidedSetupPending, checkIsAuthenticated, checkSetupNeeded } from "@/lib/auth-gate";
import { LANDING_PATHS, PUBLIC_PATHS } from "@/lib/navigation";
import type { RouterContext } from "@/lib/route-prefetch";
import { saveChosenLocale } from "@/stores/app-store";

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const needsSetup = await checkSetupNeeded(queryClient);
    if (needsSetup) {
      if (location.pathname !== "/setup" || "step" in location.search) {
        throw redirect({ to: "/setup" });
      }
      return;
    }

    const isAuthenticated = await checkIsAuthenticated(queryClient);
    const guidedSetup = isAuthenticated && (await checkGuidedSetupPending(queryClient));
    if (location.pathname === "/setup") {
      if (!guidedSetup) {
        throw redirect({ to: isAuthenticated ? "/dashboard" : "/login" });
      }
      if (!("step" in location.search)) {
        throw redirect({ to: "/setup", search: { step: "basics" } });
      }
      return;
    }

    if (isAuthenticated) {
      if (guidedSetup) {
        throw redirect({ to: "/setup", search: { step: "basics" } });
      }
      if (location.pathname === "/login" || LANDING_PATHS.has(location.pathname)) {
        throw redirect({ to: "/dashboard" });
      }
      return;
    }

    if (!PUBLIC_PATHS.has(location.pathname)) {
      throw redirect({ to: "/login" });
    }
  },
  loader: ({ context: { queryClient }, location }) => {
    if (PUBLIC_PATHS.has(location.pathname)) {
      return;
    }
    warmAppShell(queryClient);
    void queryClient.query(getMeSuspenseQueryOptions()).then(saveChosenLocale, () => undefined);
  },
  component: RootLayout,
  pendingComponent: Splash,
  pendingMs: 0,
  pendingMinMs: 0,
});

function RootLayout() {
  const location = useLocation();
  const { t } = useTranslation();
  const authenticatedArea = !PUBLIC_PATHS.has(location.pathname);
  const renderedPath = useRouterState({
    select: (state) => (state.resolvedLocation ?? state.location).pathname,
  });
  const me = useMe({ query: { enabled: authenticatedArea } });
  const instanceName = usePublicSettings()?.instanceName;

  const visiblePages = useVisibleNav(me.data?.role, authenticatedArea);

  const currentItem = visiblePages.find((item) => item.to === location.pathname);
  const currentTitle = currentItem ? t(currentItem.key) : undefined;
  const crossingSignIn = PUBLIC_PATHS.has(renderedPath) === authenticatedArea;

  if (crossingSignIn || (authenticatedArea && me.isPending)) {
    return <Splash />;
  }

  if (LANDING_PATHS.has(renderedPath)) {
    return (
      <div className="page-transition">
        {instanceName ? <title>{instanceName}</title> : null}
        <Outlet />
      </div>
    );
  }

  if (!authenticatedArea) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {instanceName ? <title>{instanceName}</title> : null}
        <div className="hero-band relative isolate bg-hero on-hero">
          <TornEdge />
          <header className="flex justify-center px-4 pt-14 pb-32 sm:pt-16">
            <Link to="/" className="max-w-full rounded-md focus-ring">
              <Brand size="lg" stacked />
            </Link>
            <div className="absolute top-3 right-3 flex gap-0.5">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </header>
        </div>
        <main className="page-transition shell-page relative -mt-24 flex flex-1 justify-center px-4 pb-16">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:bg-popover focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        {t("nav.skip")}
      </a>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {currentTitle}
      </p>
      <div className="contents print:hidden">
        <QueryBoundary
          fallback={<AppSidebarSkeleton />}
          error={<AppSidebarFallback pages={visiblePages} />}
        >
          <AppSidebar />
        </QueryBoundary>
        <QueryBoundary fallback={null} error={null}>
          <CommandPalette />
          <ShortcutsHelp />
        </QueryBoundary>
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <MobileNav pages={visiblePages} />
        <main
          id="main-content"
          className="w-full min-w-0 flex-1 space-y-5 px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 2xl:px-14 print:px-0 print:py-0"
        >
          <div className="hidden border-b border-rule pb-3 print:block">
            <Brand size="sm" />
          </div>
          <div className="contents print:hidden">
            <QueryBoundary fallback={null} error={null}>
              <EmailVerificationBanner />
              <DemoDataBanner />
            </QueryBoundary>
          </div>
          <QueryBoundary
            key={location.pathname}
            fallback={<RoutePending />}
            reveal={false}
            error={<RouteError title={currentTitle} />}
          >
            <div className="page-transition">
              <Outlet />
            </div>
          </QueryBoundary>
        </main>
      </div>
    </div>
  );
}
