import {
  Link,
  Outlet,
  createRootRouteWithContext,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  getMeSuspenseQueryOptions,
  getNotificationsSuspenseQueryOptions,
  useMe,
} from "@/api/generated";
import {
  AppSidebar,
  type NavItem,
  navLinkActiveClass,
  navLinkClass,
  useVisibleNav,
} from "@/components/app-sidebar/app-sidebar";
import { Brand } from "@/components/brand/brand";
import { HeaderActions } from "@/components/header-actions/header-actions";
import { HouseholdSwitcher } from "@/components/household-switcher/household-switcher";
import { LanguageToggle } from "@/components/language-toggle/language-toggle";
import { LogoutButton } from "@/components/logout-button/logout-button";
import { unreadParams } from "@/components/notification-bell/notification-bell";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RouteError } from "@/components/route-error/route-error";
import { RoutePending } from "@/components/route-pending/route-pending";
import { Splash } from "@/components/splash/splash";
import { ThemeToggle } from "@/components/theme-toggle/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { CommandPalette } from "@/features/command-palette/command-palette/command-palette";
import { EmailVerificationBanner } from "@/features/profile/email-verification-banner/email-verification-banner";
import { settingsQueryOptions, usePublicSettings } from "@/hooks/use-settings";
import { checkIsAuthenticated, checkSetupNeeded } from "@/lib/auth-gate";
import { PUBLIC_PATHS, profileNavPage } from "@/lib/navigation";
import { type RouterContext, warm } from "@/lib/route-prefetch";
import { cn } from "@/lib/utils";

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const needsSetup = await checkSetupNeeded();
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
    warm(queryClient, settingsQueryOptions());
    warm(queryClient, getMeSuspenseQueryOptions());
    warm(queryClient, getNotificationsSuspenseQueryOptions(unreadParams));
  },
  component: RootLayout,
  pendingComponent: Splash,
  pendingMs: 0,
  pendingMinMs: 0,
});

interface MobileNavItem {
  to: NavItem["to"] | (typeof profileNavPage)["to"];
  key: NavItem["key"] | (typeof profileNavPage)["key"];
}

function RootLayout() {
  const location = useLocation();
  const { t } = useTranslation();
  const authenticatedArea = !PUBLIC_PATHS.has(location.pathname);
  const me = useMe({ query: { enabled: authenticatedArea } });
  const instanceName = usePublicSettings()?.instanceName;

  const mobileNavItems: readonly MobileNavItem[] = [
    ...useVisibleNav(me.data?.role, authenticatedArea),
    profileNavPage,
  ];

  const currentItem = mobileNavItems.find((item) => item.to === location.pathname);
  const currentTitle = currentItem ? t(currentItem.key) : undefined;

  if (!authenticatedArea) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-background px-4">
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
        <QueryBoundary
          fallback={<Skeleton className="hidden h-screen w-58 shrink-0 rounded-none md:block" />}
        >
          <AppSidebar />
        </QueryBoundary>
        <QueryBoundary fallback={null} errorFallback={null}>
          <CommandPalette />
        </QueryBoundary>
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-0.5 border-b bg-sidebar px-4 sm:px-6 md:hidden print:hidden">
          <Link to="/" className="mr-auto flex items-center">
            <Brand size="sm" />
          </Link>
          <QueryBoundary fallback={null} errorFallback={null}>
            <HouseholdSwitcher className="w-28" />
          </QueryBoundary>
          <HeaderActions />
          <LogoutButton />
        </header>

        <nav
          aria-label={t("nav.main")}
          className="flex gap-1 overflow-x-auto border-b bg-sidebar px-2 py-1.5 md:hidden print:hidden"
        >
          {mobileNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(navLinkClass, "shrink-0 px-3 py-2 pointer-coarse:py-3")}
              activeProps={{ className: navLinkActiveClass }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <main
          id="main-content"
          className="w-full min-w-0 flex-1 space-y-5 px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 2xl:px-14 print:px-0 print:py-0"
        >
          <div className="contents print:hidden">
            <QueryBoundary fallback={null} errorFallback={null}>
              <EmailVerificationBanner />
            </QueryBoundary>
          </div>
          <QueryBoundary
            key={location.pathname}
            fallback={<RoutePending />}
            reveal={false}
            renderError={(retry) => <RouteError title={currentTitle} onRetry={retry} />}
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
