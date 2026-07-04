import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Tags,
  Wallet,
  WalletCards,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/stores/sidebar-store";

const navItems = [
  { to: "/", key: "nav.dashboard", icon: LayoutDashboard },
  { to: "/transactions", key: "nav.transactions", icon: ArrowLeftRight },
  { to: "/accounts", key: "nav.accounts", icon: WalletCards },
  { to: "/categories", key: "nav.categories", icon: Tags },
] as const;

export function AppSidebar() {
  const { t } = useTranslation();
  const { collapsed, toggleSidebar } = useSidebarCollapsed();

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r bg-card transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-4.5" />
          </span>
          {collapsed ? null : (
            <span className="truncate text-base font-semibold tracking-tight">
              {t("appName")}
            </span>
          )}
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              collapsed && "justify-center px-0",
            )}
            activeProps={{ className: "bg-accent text-accent-foreground" }}
            activeOptions={{ exact: item.to === "/" }}
            title={collapsed ? t(item.key) : undefined}
          >
            <item.icon className="size-4 shrink-0" />
            {collapsed ? null : t(item.key)}
          </Link>
        ))}
      </nav>

      <div className="border-t px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-8", !collapsed && "ml-auto flex")}
          onClick={toggleSidebar}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>
    </aside>
  );
}
