import { Link, useLocation } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMeSuspense } from "@/api/generated";
import { AccountMenu } from "@/components/account-menu/account-menu";
import { Brand } from "@/components/brand/brand";
import { HouseholdSwitcher } from "@/components/household-switcher/household-switcher";
import { NotificationBellSlot } from "@/components/notification-bell/notification-bell";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SupportLink } from "@/components/support-link/support-link";
import { Button } from "@/components/ui/button/button";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { useVisibleNav } from "@/hooks/use-visible-nav";
import { isEntryActive, navEntries } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/stores/sidebar-store";
import { navLinkActiveClass, navLinkClass } from "./nav-link-class";

export function AppSidebarSkeleton() {
  const { collapsed } = useSidebarCollapsed();

  return (
    <div
      aria-hidden="true"
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r bg-sidebar md:block",
        collapsed ? "w-16" : "w-58",
      )}
    />
  );
}

export function AppSidebar() {
  const { t } = useTranslation();
  const { collapsed, toggleSidebar } = useSidebarCollapsed();
  const me = useMeSuspense();
  const entries = navEntries(useVisibleNav(me.data?.role));
  const { pathname } = useLocation();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar transition-width duration-base ease-out-expo md:flex",
        collapsed ? "w-16" : "w-58",
      )}
    >
      <Link
        to="/"
        className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center" : "px-5")}
      >
        <Brand compact={collapsed} />
      </Link>

      <Button
        type="button"
        variant="outline"
        size="icon-handle"
        className="absolute top-5 -right-3 z-20"
        tooltipSide="right"
        onClick={toggleSidebar}
        aria-label={t(collapsed ? "nav.expand" : "nav.collapse")}
      >
        {collapsed ? <ChevronRight /> : <ChevronLeft />}
      </Button>

      <div className={cn("px-3 pb-2", collapsed && "px-2")}>
        <QueryBoundary
          fallback={<Skeleton className="h-8 w-full rounded-md pointer-coarse:h-11" />}
          error={null}
        >
          <HouseholdSwitcher collapsed={collapsed} />
        </QueryBoundary>
      </div>

      <nav
        aria-label={t("nav.main")}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pt-1 pb-3"
      >
        {entries.map((entry, index) => {
          const active = isEntryActive(entry, pathname);
          return (
            <Tooltip key={entry.to} content={collapsed ? t(entry.key) : undefined} side="right">
              <Link
                to={entry.to}
                aria-label={collapsed ? t(entry.key) : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  navLinkClass,
                  "flex items-center gap-3 px-3 py-2",
                  collapsed && "justify-center px-0",
                  index > 0 && entries[index - 1]?.group !== entry.group && "mt-4",
                  entry.hub === "settings" && "mt-auto",
                  active && navLinkActiveClass,
                )}
                style={{ "--nav-link": `nav-side-${index}` }}
              >
                <entry.icon className="size-4 shrink-0" />
                {collapsed ? null : t(entry.key)}
              </Link>
            </Tooltip>
          );
        })}
      </nav>

      <div className={cn("px-3 pb-3", collapsed && "px-2")}>
        <SupportLink collapsed={collapsed} />
        <NotificationBellSlot sidebar={collapsed ? "collapsed" : "expanded"} />
      </div>

      <div className={cn("flex border-t p-3", collapsed && "justify-center p-2")}>
        <AccountMenu
          compact={collapsed}
          side={collapsed ? "right" : "top"}
          align={collapsed ? "end" : "start"}
          className={collapsed ? undefined : "flex-1"}
        />
      </div>
    </aside>
  );
}
