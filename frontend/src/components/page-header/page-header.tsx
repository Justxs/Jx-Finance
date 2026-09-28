import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { HubTabs, useHubTabs } from "@/components/hub-tabs/hub-tabs";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const hub = useHubTabs();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1
            className={cn(
              "min-w-0 font-serif text-page-title font-semibold text-balance wrap-break-word lining-nums",
              hub && "hub-title",
            )}
            style={hub ? { "--hub-title": `hub-title-${hub.current.hub}` } : undefined}
          >
            {hub ? t(hub.titleKey) : title}
          </h1>
          {description && !hub ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children ? (
          <div className="flex max-w-full flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            {children}
          </div>
        ) : null}
      </div>
      {hub ? <HubTabs current={hub.current} pages={hub.pages} /> : null}
      {description && hub ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
