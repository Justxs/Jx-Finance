import { useTranslation } from "react-i18next";
import { useHubTabs } from "@/components/hub-tabs/hub-tabs";
import { PageHeader } from "@/components/page-header/page-header";
import { Section } from "@/components/ui/section/section";
import { RowsSkeleton, Skeleton, StatsSkeleton } from "@/components/ui/skeleton/skeleton";

export function RoutePending() {
  const { t } = useTranslation();
  const hub = useHubTabs();

  return (
    <div className="space-y-5" role="status" aria-busy="true">
      <span className="sr-only">{t("errors.loading")}</span>
      {hub ? (
        <PageHeader title={t(hub.titleKey)} />
      ) : (
        <div className="space-y-2">
          <Skeleton className="h-9 w-48 max-w-full rounded-sm" />
          <Skeleton className="h-4 w-28 rounded-sm" />
        </div>
      )}
      <StatsSkeleton />
      <Section className="space-y-4">
        <Skeleton className="h-5 w-40 rounded-sm" />
        <RowsSkeleton rows={6} />
      </Section>
    </div>
  );
}
