import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  CalendarClock,
  FileBarChart,
  House,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  Scale,
  Tags,
  Target,
  Users,
  Wallet,
  WalletCards,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMeEndpointSuspense } from "@/api/generated";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/stores/sidebar-store";

function initials(name: string | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) {
    return "?";
  }

  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export const navItems = [
  { to: "/", key: "nav.dashboard", icon: LayoutDashboard },
  { to: "/transactions", key: "nav.transactions", icon: ArrowLeftRight },
  { to: "/accounts", key: "nav.accounts", icon: WalletCards },
  { to: "/categories", key: "nav.categories", icon: Tags },
  { to: "/budgets", key: "nav.budgets", icon: PiggyBank },
  { to: "/goals", key: "nav.goals", icon: Target },
  { to: "/net-worth", key: "nav.netWorth", icon: Scale },
  { to: "/recurring-bills", key: "nav.recurringBills", icon: CalendarClock },
  { to: "/households", key: "nav.households", icon: House },
  { to: "/reports", key: "nav.reports", icon: FileBarChart },
] as const;

export function AppSidebar() {
  const { t } = useTranslation();
  const { collapsed, toggleSidebar } = useSidebarCollapsed();
  const me = useMeEndpointSuspense();

  const visibleNavItems =
    me.data?.role === "Admin"
      ? [...navItems, { to: "/users" as const, key: "nav.users", icon: Users }]
      : navItems;

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen md:flex shrink-0 flex-col border-r bg-card transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-4.5" />
          </span>
          {collapsed ? null : (
            <span className="truncate text-base font-semibold tracking-tight">{t("appName")}</span>
          )}
        </Link>
      </div>

      <nav
        aria-label={t("nav.main")}
        className="flex min-h-0 overflow-y-auto flex-1 flex-col gap-1 px-3"
      >
        {visibleNavItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              collapsed && "justify-center px-0",
            )}
            activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }}
            activeOptions={{ exact: item.to === "/" }}
            title={collapsed ? t(item.key) : undefined}
          >
            <item.icon className="size-4 shrink-0" />
            {collapsed ? null : t(item.key)}
          </Link>
        ))}
      </nav>

      <div className="border-t p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Link
              to="/profile"
              className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-primary"
              title={me.data?.displayName ?? undefined}
            >
              {initials(me.data?.displayName)}
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={toggleSidebar}
              aria-label={t("nav.expand")}
              title={t("nav.expand")}
            >
              <PanelLeftOpen />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Link
              to="/profile"
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-accent"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-primary">
                {initials(me.data?.displayName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {me.data?.displayName || t("nav.profile")}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {me.data?.email}
                </span>
              </span>
            </Link>
            <LogoutButton />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={toggleSidebar}
              aria-label={t("nav.collapse")}
              title={t("nav.collapse")}
            >
              <PanelLeftClose />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
