import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/hooks/use-settings";
import { isPageEnabled, navHubs, navPages } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type HubPage = Extract<(typeof navPages)[number], { hub: string }>;

function isHubPage(page: (typeof navPages)[number]): page is HubPage {
  return "hub" in page;
}

const hubPages = navPages.filter(isHubPage);

export function useHubTabs() {
  const { pathname } = useLocation();
  const current = hubPages.find((page) => page.to === pathname && navHubs[page.hub].tabs);
  const { features } = useSettings({ enabled: current !== undefined });
  if (!current) {
    return undefined;
  }

  const pages = hubPages.filter(
    (page) => page.hub === current.hub && isPageEnabled(page, features),
  );
  return pages.length > 1 ? { titleKey: navHubs[current.hub].key, current, pages } : undefined;
}

interface Props {
  current: HubPage;
  pages: readonly HubPage[];
}

export function HubTabs({ current, pages }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t(navHubs[current.hub].key)}
      className="hub-tabs flex flex-wrap gap-x-5 border-b border-rule"
      style={{ "--hub-tabs": `hub-tabs-${current.hub}` }}
    >
      {pages.map((page) => {
        const active = page.to === current.to;
        return (
          <Link
            key={page.to}
            to={page.to}
            preload="render"
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-9 shrink-0 items-center gap-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all duration-200 ease-out-expo outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset pointer-coarse:h-11",
              active && "font-semibold text-foreground",
            )}
          >
            <page.icon aria-hidden="true" className="size-4 shrink-0" />
            {t(page.key)}
            {active ? (
              <span
                aria-hidden="true"
                className="hub-tab-indicator absolute inset-x-0 -bottom-px h-0.5 bg-foreground"
                style={{ "--hub-tab-indicator": `hub-tab-indicator-${current.hub}` }}
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
