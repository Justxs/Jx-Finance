import { Link, Outlet, createRootRoute, redirect, useLocation } from "@tanstack/react-router";
import { UserCog } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { LanguageToggle } from "@/components/language-toggle";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
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

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-end gap-1.5 border-b bg-card px-8">
          <NotificationBell />
          <LanguageToggle />
          <ThemeToggle />
          <Link
            to="/profile"
            className={buttonVariants({ variant: "outline", size: "icon" })}
            aria-label="Profile"
            title="Profile"
          >
            <UserCog />
          </Link>
          <LogoutButton />
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-10">
          <Outlet />
        </main>

        <footer className="mx-auto w-full max-w-5xl px-8 pb-8 text-xs uppercase tracking-[0.28em] text-muted-foreground">
          Local-first, self-hosted.
        </footer>
      </div>
    </div>
  );
}
