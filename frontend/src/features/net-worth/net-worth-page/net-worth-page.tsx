import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/page-header";
import { QueryBoundary } from "@/components/query-boundary";
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
        <section className="section">
          <h2 className="section-title mb-4">{t("netWorth.trend")}</h2>
          <QueryBoundary
            fallback={<Skeleton className="h-56 w-full" />}
            errorSubject={t("netWorth.trend")}
          >
            <NetWorthHistoryChart />
          </QueryBoundary>
        </section>
        <section className="section">
          <h2 className="section-title mb-4">{t("netWorth.composition")}</h2>
          <QueryBoundary
            fallback={<Skeleton className="h-56 w-full" />}
            errorSubject={t("netWorth.composition")}
          >
            <NetWorthCompositionChart />
          </QueryBoundary>
        </section>
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
