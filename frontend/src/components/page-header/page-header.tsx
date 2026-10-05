import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { HubTabs, useHubTabs } from "@/components/hub-tabs/hub-tabs";
import { ButtonSkeleton, TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { usePublicSettings } from "@/hooks/use-settings";
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

type Hub = NonNullable<ReturnType<typeof useHubTabs>>;

const titleClass =
  "min-w-0 font-serif text-page-title font-semibold text-balance wrap-break-word lining-nums";

function HubHeader({ hub, children }: Readonly<{ hub: Hub; children?: ReactNode }>) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <HeaderRow
        heading={
          <h1
            className={cn(titleClass, "hub-title")}
            style={{ "--hub-title": `hub-title-${hub.current.hub}` }}
          >
            {t(hub.titleKey)}
          </h1>
        }
        actions={children}
      />
      <HubTabs current={hub.current} pages={hub.pages} />
    </div>
  );
}

interface Props {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function DocumentTitle({ title }: Readonly<{ title: string }>) {
  const { t } = useTranslation();
  const instanceName = usePublicSettings()?.instanceName;

  return <title>{`${title} · ${instanceName ?? t("brand.wordmark")}`}</title>;
}

export function PageHeader({ title, description, children }: Readonly<Props>) {
  const hub = useHubTabs();

  if (hub) {
    return (
      <>
        <DocumentTitle title={title} />
        <HubHeader hub={hub}>{children}</HubHeader>
      </>
    );
  }

  return (
    <>
      <DocumentTitle title={title} />
      <HeaderRow
        heading={
          <>
            <h1 className={titleClass}>{title}</h1>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </>
        }
        actions={children}
      />
    </>
  );
}

interface SkeletonProps {
  description?: boolean;
  actions?: number | ReactNode;
}

export function PageHeaderSkeleton({ description = false, actions = 0 }: Readonly<SkeletonProps>) {
  const hub = useHubTabs();
  const buttons =
    typeof actions === "number"
      ? Array.from({ length: actions }, (_, index) => <ButtonSkeleton key={index} />)
      : actions;

  if (hub) {
    return <HubHeader hub={hub}>{buttons}</HubHeader>;
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
