import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/page-header";
import { QueryBoundary } from "@/components/query-boundary";
import { Section, SectionTitle } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetsSection } from "../assets-section";
import { DebtsSection } from "../debts-section";
import { NetWorthCompositionChart } from "../net-worth-composition-chart";
import { NetWorthHistoryChart } from "../net-worth-history-chart";
import { NetWorthStats } from "../net-worth-stats";

export function NetWorthPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <PageHeader title={t("netWorth.title")} />

      <QueryBoundary fallback={<Skeleton className="h-28 w-full" />}>
        <NetWorthStats />
      </QueryBoundary>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section>
          <SectionTitle className="mb-4">{t("netWorth.trend")}</SectionTitle>
          <QueryBoundary
            fallback={<Skeleton className="h-56 w-full" />}
            errorSubject={t("netWorth.trend")}
          >
            <NetWorthHistoryChart />
          </QueryBoundary>
        </Section>
        <Section>
          <SectionTitle className="mb-4">{t("netWorth.composition")}</SectionTitle>
          <QueryBoundary
            fallback={<Skeleton className="h-56 w-full" />}
            errorSubject={t("netWorth.composition")}
          >
            <NetWorthCompositionChart />
          </QueryBoundary>
        </Section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <QueryBoundary fallback={<Skeleton className="h-40 w-full" />}>
          <AssetsSection />
        </QueryBoundary>
        <QueryBoundary fallback={<Skeleton className="h-40 w-full" />}>
          <DebtsSection />
        </QueryBoundary>
      </div>
    </div>
  );
}
