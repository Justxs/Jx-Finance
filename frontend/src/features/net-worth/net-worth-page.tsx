import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/page-header";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetsSection } from "./assets-section";
import { DebtsSection } from "./debts-section";
import { NetWorthHistoryChart } from "./net-worth-history-chart";
import { NetWorthStats } from "./net-worth-stats";

export function NetWorthPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PageHeader title={t("netWorth.title")} />

      <QueryBoundary fallback={<Skeleton className="h-28 w-full" />}>
        <NetWorthStats />
      </QueryBoundary>

      <section className="card p-6">
        <h2 className="mb-4 font-semibold">{t("netWorth.trend")}</h2>
        <QueryBoundary fallback={<Skeleton className="h-56 w-full" />}>
          <NetWorthHistoryChart />
        </QueryBoundary>
      </section>

      <QueryBoundary fallback={<Skeleton className="h-40 w-full" />}>
        <AssetsSection />
      </QueryBoundary>
      <QueryBoundary fallback={<Skeleton className="h-40 w-full" />}>
        <DebtsSection />
      </QueryBoundary>
    </div>
  );
}
