import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  CalendarClock,
  FileBarChart,
  FileUp,
  House,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  Scale,
  Tags,
  Target,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMeEndpointSuspense } from "@/api/generated";
import type { FeatureFlags } from "@/api/generated/model";
import { Brand } from "@/components/brand";
import { LanguageToggle } from "@/components/language-toggle";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell, NotificationBellUnavailable } from "@/components/notification-bell";
import { QueryBoundary } from "@/components/query-boundary";
import { ShortcutsHelp } from "@/components/shortcuts-help";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { useSettings } from "@/hooks/use-settings";
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

const navItems = [
  { to: "/", key: "nav.dashboard", icon: LayoutDashboard, group: "ledger" },
  { to: "/transactions", key: "nav.transactions", icon: ArrowLeftRight, group: "ledger" },
  { to: "/import", key: "nav.import", icon: FileUp, group: "ledger", feature: "import" },
  { to: "/accounts", key: "nav.accounts", icon: WalletCards, group: "ledger" },
  { to: "/categories", key: "nav.categories", icon: Tags, group: "ledger" },
  { to: "/budgets", key: "nav.budgets", icon: PiggyBank, group: "plan", feature: "budgets" },
  { to: "/goals", key: "nav.goals", icon: Target, group: "plan", feature: "goals" },
  {
    to: "/recurring-bills",
    key: "nav.recurringBills",
    icon: CalendarClock,
    group: "plan",
    feature: "recurringBills",
  },
  { to: "/net-worth", key: "nav.netWorth", icon: Scale, group: "review", feature: "netWorth" },
  { to: "/reports", key: "nav.reports", icon: FileBarChart, group: "review", feature: "reports" },
  { to: "/households", key: "nav.households", icon: House, group: "manage", feature: "households" },
] as const;

const adminNavItems = [
  { to: "/users", key: "nav.users", icon: Users, group: "manage" },
  { to: "/settings", key: "nav.settings", icon: Settings, group: "manage" },
] as const;

export function visibleNav(features: FeatureFlags, isAdmin: boolean) {
  const enabled = navItems.filter((item) => !("feature" in item) || features[item.feature]);
  return isAdmin ? [...enabled, ...adminNavItems] : enabled;
}

export const navLinkClass =
  "rounded-md border border-transparent text-sm text-muted-foreground transition-colors hover:text-foreground";

export const navLinkActiveClass = "border-border! bg-background font-semibold text-foreground!";

export function AppSidebar() {
  const { t } = useTranslation();
  const { collapsed, toggleSidebar } = useSidebarCollapsed();
  const me = useMeEndpointSuspense();

  const settings = useSettings();
  const visibleNavItems = visibleNav(settings.features, me.data?.role === "Admin");

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 ease-out-expo md:flex",
        collapsed ? "w-16" : "w-58",
      )}
    >
      <Link
        to="/"
        className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center" : "px-5")}
      >
        <Brand compact={collapsed} />
      </Link>

      <nav
        aria-label={t("nav.main")}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3"
      >
        {visibleNavItems.map((item, index) => (
          <Tooltip key={item.to} content={collapsed ? t(item.key) : undefined} side="right">
            <Link
              to={item.to}
              aria-label={collapsed ? t(item.key) : undefined}
              className={cn(
                navLinkClass,
                "flex items-center gap-3 px-3 py-2",
                collapsed && "justify-center px-0",
                index > 0 && visibleNavItems[index - 1]?.group !== item.group && "mt-4",
              )}
              activeProps={{ className: navLinkActiveClass }}
              activeOptions={{ exact: item.to === "/" }}
            >
              <item.icon className="size-4 shrink-0" />
              {collapsed ? null : t(item.key)}
            </Link>
          </Tooltip>
        ))}
      </nav>

      <div
        className={cn(
          "flex gap-0.5 px-3 pb-2",
          collapsed ? "flex-col items-center" : "items-center",
        )}
      >
        <QueryBoundary
          fallback={<Skeleton className="size-9 rounded-md" />}
          errorFallback={<NotificationBellUnavailable />}
        >
          <NotificationBell placement="above" />
        </QueryBoundary>
        <LanguageToggle />
        <ThemeToggle />
        <ShortcutsHelp />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={collapsed ? undefined : "ml-auto"}
          onClick={toggleSidebar}
          aria-label={t(collapsed ? "nav.expand" : "nav.collapse")}
          tooltip={t(collapsed ? "nav.expand" : "nav.collapse")}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>

      <div className={cn("flex items-center gap-1 border-t p-3", collapsed && "flex-col")}>
        <Tooltip
          content={[me.data?.displayName, me.data?.email].filter(Boolean).join(" · ") || undefined}
          side={collapsed ? "right" : "top"}
        >
          <Link
            to="/profile"
            aria-label={collapsed ? me.data?.displayName || t("nav.profile") : undefined}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-accent"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
              {initials(me.data?.displayName)}
            </span>
            {collapsed ? null : (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {me.data?.displayName || t("nav.profile")}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {me.data?.email}
                </span>
              </span>
            )}
          </Link>
        </Tooltip>
        <LogoutButton />
      </div>
    </aside>
  );
}
