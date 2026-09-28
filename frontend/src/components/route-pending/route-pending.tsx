import { useMatches, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PageHeaderSkeleton } from "@/components/page-header/page-header";
import { SummaryStatsSkeleton } from "@/components/summary-stats/summary-stats";
import { SectionSkeleton } from "@/components/ui/skeleton/skeleton";
import { cn } from "@/lib/utils";

interface PagePendingProps {
  description?: boolean;
  actions?: number | ReactNode;
  header?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function PagePending({
  description,
  actions,
  header,
  className,
  children,
}: Readonly<PagePendingProps>) {
  const { t } = useTranslation();

  return (
    <div className={cn("space-y-5", className)} aria-busy="true">
      <span role="status" className="sr-only">
        {t("errors.loading")}
      </span>
      {header ?? <PageHeaderSkeleton description={description} actions={actions} />}
      {children}
    </div>
  );
}

export function RoutePending() {
  const router = useRouter();
  const routeId = useMatches({ select: (matches) => matches.at(-1)?.routeId });
  const Pending =
    routeId === undefined ? undefined : router.routesById[routeId].options.pendingComponent;

  if (Pending && Pending !== RoutePending) {
    return <Pending />;
  }

  return (
    <PagePending>
      <SummaryStatsSkeleton />
      <SectionSkeleton rows={6} />
    </PagePending>
  );
}
