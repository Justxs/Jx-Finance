import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { ArrowLeftRight, LayoutDashboard, Tags, Wallet, WalletCards } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createRootRoute({
  component: RootLayout,
});

const navItems = [
  { to: "/", key: "nav.dashboard", icon: LayoutDashboard },
  { to: "/transactions", key: "nav.transactions", icon: ArrowLeftRight },
  { to: "/accounts", key: "nav.accounts", icon: WalletCards },
  { to: "/categories", key: "nav.categories", icon: Tags },
] as const;

function RootLayout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="size-4.5" />
            </span>
            <span className="text-base font-semibold tracking-tight">{t("appName")}</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                <item.icon className="size-4" />
                <span className="hidden sm:inline">{t(item.key)}</span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <Outlet />
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-10 text-xs uppercase tracking-[0.28em] text-muted-foreground">
        Local-first, self-hosted.
      </footer>
    </div>
  );
}
