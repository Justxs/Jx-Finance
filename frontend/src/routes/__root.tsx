import { Link, Outlet, createRootRoute, redirect, useLocation } from "@tanstack/react-router";
import { AppSidebar, navItems } from "@/components/app-sidebar";
import { LanguageToggle } from "@/components/language-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslation } from "react-i18next";
import { useMeEndpoint } from "@/api/generated";
import { checkIsAuthenticated, checkSetupNeeded } from "@/lib/auth-gate";

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

function RootLayout() {
  const location = useLocation();
  const { t } = useTranslation();
  const me = useMeEndpoint({ query: { enabled: !UNAUTHENTICATED_PATHS.has(location.pathname) } });

  if (UNAUTHENTICATED_PATHS.has(location.pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:p-3">
          {t("nav.skip")}
        </a>
        <header className="flex h-14 shrink-0 items-center gap-1.5 border-b bg-card px-4 sm:px-6">
          <span className="mr-auto text-sm font-medium text-muted-foreground">{t("appName")}</span>
          <NotificationBell />
          <LanguageToggle />
          <ThemeToggle />
          <div className="md:hidden">
            <LogoutButton />
          </div>
        </header>

        <nav
          aria-label={t("nav.main")}
          className="flex gap-1 overflow-x-auto border-b bg-card p-2 md:hidden"
        >
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 rounded px-3 py-2 text-sm text-muted-foreground"
              activeProps={{ className: "bg-accent text-foreground font-semibold" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {t(item.key)}
            </Link>
          ))}
          {me.data?.role === "Admin" ? (
            <Link to="/users" className="shrink-0 px-3 py-2 text-sm">
              {t("nav.users")}
            </Link>
          ) : null}
          <Link to="/profile" className="shrink-0 px-3 py-2 text-sm">
            {t("nav.profile")}
          </Link>
        </nav>
        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
