import {
  Outlet,
  createRootRouteWithContext,
  redirect,
  useLocation,
  useRouterState,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getMeSuspenseQueryOptions, useMe } from "@/api/generated";
import { AppSidebar, AppSidebarSkeleton } from "@/components/app-sidebar/app-sidebar";
import { MobileNav } from "@/components/app-sidebar/mobile-nav";
import { LanguageToggle } from "@/components/language-toggle/language-toggle";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RouteError } from "@/components/route-error/route-error";
import { RoutePending } from "@/components/route-pending/route-pending";
import { ShortcutsHelp } from "@/components/shortcuts-help/shortcuts-help";
import { Splash } from "@/components/splash/splash";
import { ThemeToggle } from "@/components/theme-toggle/theme-toggle";
import { CommandPalette } from "@/features/command-palette/command-palette/command-palette";
import { EmailVerificationBanner } from "@/features/profile/email-verification-banner/email-verification-banner";
import { usePublicSettings } from "@/hooks/use-settings";
import { useVisibleNav } from "@/hooks/use-visible-nav";
import { warmAppShell } from "@/lib/app-shell";
import { checkIsAuthenticated, checkSetupNeeded } from "@/lib/auth-gate";
import { PUBLIC_PATHS } from "@/lib/navigation";
import type { RouterContext } from "@/lib/route-prefetch";
import { saveChosenLocale } from "@/stores/app-store";

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const needsSetup = await checkSetupNeeded(queryClient);
    if (needsSetup) {
      if (location.pathname !== "/setup") {
        throw redirect({ to: "/setup" });
      }
      return;
    }

    if (location.pathname === "/setup") {
      throw redirect({ to: "/login" });
    }

    const isAuthenticated = await checkIsAuthenticated(queryClient);
    if (isAuthenticated) {
      if (location.pathname === "/login") {
        throw redirect({ to: "/" });
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

  if (!authenticatedArea) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-background px-4 py-16">
        {instanceName ? <title>{instanceName}</title> : null}
        <div className="absolute top-3 right-3 flex gap-0.5">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <Outlet />
      </main>
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
      <div className="contents print:hidden">
        <QueryBoundary fallback={<AppSidebarSkeleton />} error={<AppSidebarSkeleton />}>
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
          <div className="contents print:hidden">
            <QueryBoundary fallback={null} error={null}>
              <EmailVerificationBanner />
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
