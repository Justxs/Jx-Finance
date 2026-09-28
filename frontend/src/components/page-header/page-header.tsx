import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { HubTabs, useHubTabs } from "@/components/hub-tabs/hub-tabs";
import { ButtonSkeleton, TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { cn } from "@/lib/utils";

interface HeaderRowProps {
  heading: ReactNode;
  actions?: ReactNode;
}

function HeaderRow({ heading, actions }: Readonly<HeaderRowProps>) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">{heading}</div>
      {actions ? (
        <div className="flex max-w-full flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

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
      <HeaderRow
        heading={
          <>
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
          </>
        }
        actions={children}
      />
      {hub ? <HubTabs current={hub.current} pages={hub.pages} /> : null}
    </div>
  );
}

interface SkeletonProps {
  description?: boolean;
  actions?: number | ReactNode;
}

export function PageHeaderSkeleton({ description = false, actions = 0 }: Readonly<SkeletonProps>) {
  const { t } = useTranslation();
  const hub = useHubTabs();
  const buttons =
    typeof actions === "number"
      ? Array.from({ length: actions }, (_, index) => <ButtonSkeleton key={index} />)
      : actions;

  if (hub) {
    return <PageHeader title={t(hub.titleKey)}>{buttons}</PageHeader>;
  }

  return (
    <HeaderRow
      heading={
        <>
          <TextSkeleton size="page" width="w-48" />
          {description ? <TextSkeleton size="sm" className="mt-1" width="w-40" /> : null}
        </>
      }
      actions={buttons}
    />
  );
}
