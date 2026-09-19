import { Link, Outlet, createRootRoute, redirect, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMeEndpoint } from "@/api/generated";
import {
  AppSidebar,
  type NavItem,
  navLinkActiveClass,
  navLinkClass,
  visibleNav,
} from "@/components/app-sidebar";
import { Brand } from "@/components/brand";
import { LanguageToggle } from "@/components/language-toggle";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell, NotificationBellUnavailable } from "@/components/notification-bell";
import { QueryBoundary } from "@/components/query-boundary";
import { RouteError } from "@/components/route-error";
import { RoutePending } from "@/components/route-pending";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicSettings, useSettings } from "@/hooks/use-settings";
import { checkIsAuthenticated, checkSetupNeeded } from "@/lib/auth-gate";
import { cn } from "@/lib/utils";

const UNAUTHENTICATED_PATHS = new Set(["/login", "/setup"]);

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
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

    const isAuthenticated = await checkIsAuthenticated();
    if (isAuthenticated) {
      if (location.pathname === "/login") {
        throw redirect({ to: "/" });
      }
      return;
    }

    if (location.pathname !== "/login") {
      throw redirect({ to: "/login" });
    }
  },
  component: RootLayout,
});

interface MobileNavItem {
  to: NavItem["to"] | "/profile";
  key: NavItem["key"] | "nav.profile";
}

function RootLayout() {
  const location = useLocation();
  const { t } = useTranslation();
  const authenticatedArea = !UNAUTHENTICATED_PATHS.has(location.pathname);
  const me = useMeEndpoint({ query: { enabled: authenticatedArea } });
  const settings = useSettings({ enabled: authenticatedArea });
  const instanceName = usePublicSettings()?.instanceName;

  const mobileNavItems: readonly MobileNavItem[] = [
    ...visibleNav(settings.features, me.data?.role === "Admin"),
    { to: "/profile", key: "nav.profile" },
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
      <QueryBoundary
        fallback={<Skeleton className="hidden h-screen w-58 shrink-0 rounded-none md:block" />}
      >
        <AppSidebar />
      </QueryBoundary>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-0.5 border-b bg-sidebar px-4 sm:px-6 md:hidden">
          <Link to="/" className="mr-auto flex items-center">
            <Brand size="sm" />
          </Link>
          <QueryBoundary
            fallback={<Skeleton className="size-9 rounded-md" />}
            errorFallback={<NotificationBellUnavailable />}
          >
            <NotificationBell />
          </QueryBoundary>
          <LanguageToggle />
          <ThemeToggle />
          <LogoutButton />
        </header>

        <nav
          aria-label={t("nav.main")}
          className="flex gap-1 overflow-x-auto border-b bg-sidebar px-2 py-1.5 md:hidden"
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
          className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10"
        >
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
