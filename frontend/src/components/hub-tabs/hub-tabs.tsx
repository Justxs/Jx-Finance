import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { tabsListClass, tabsTabClass } from "@/components/ui/tabs/tabs";
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
      className={cn("hub-tabs print:hidden", tabsListClass)}
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
            className={cn("relative", tabsTabClass, active && "font-semibold text-foreground")}
          >
            <page.icon aria-hidden="true" className="size-4 shrink-0" />
            {t("tabKey" in page ? page.tabKey : page.key)}
            {active ? (
              <span
                aria-hidden="true"
                className="hub-tab-indicator absolute inset-x-0 bottom-0 h-0.5 bg-foreground"
                style={{ "--hub-tab-indicator": `hub-tab-indicator-${current.hub}` }}
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
