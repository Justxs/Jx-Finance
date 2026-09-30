import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AccountMenu } from "@/components/account-menu/account-menu";
import { Brand } from "@/components/brand/brand";
import { HouseholdSwitcher } from "@/components/household-switcher/household-switcher";
import { NotificationBellSlot } from "@/components/notification-bell/notification-bell";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { type NavItem, isEntryActive, navEntries } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { navLinkActiveClass, navLinkClass } from "./nav-link-class";

interface Props {
  pages: readonly NavItem[];
}

export function MobileNav({ pages }: Readonly<Props>) {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-0.5 border-b bg-sidebar px-4 sm:px-6 md:hidden print:hidden">
        <Link to="/" className="mr-auto flex items-center">
          <Brand size="sm" />
        </Link>
        <QueryBoundary fallback={null} error={null}>
          <HouseholdSwitcher className="w-28" />
        </QueryBoundary>
        <NotificationBellSlot />
        <QueryBoundary
          fallback={
            <div className="p-1.5">
              <Skeleton className="size-8 rounded-md" />
            </div>
          }
          error={null}
        >
          <AccountMenu compact side="bottom" align="end" />
        </QueryBoundary>
      </header>

      <nav
        aria-label={t("nav.main")}
        className="flex gap-1 overflow-x-auto border-b bg-sidebar px-2 py-1.5 md:hidden print:hidden"
      >
        {navEntries(pages).map((entry, index) => {
          const active = isEntryActive(entry, pathname);
          return (
            <Link
              key={entry.to}
              to={entry.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                navLinkClass,
                "shrink-0 px-3 py-2 pointer-coarse:py-3",
                active && navLinkActiveClass,
              )}
              style={{ "--nav-link": `nav-strip-${index}` }}
            >
              {t(entry.key)}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
