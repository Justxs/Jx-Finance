import { useTranslation } from "react-i18next";
import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { NetWorthHistoryChart } from "@/components/net-worth-history-chart";
import { PageHeader } from "@/components/page-header/page-header";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SummaryStatsSkeleton } from "@/components/summary-stats/summary-stats";
import { TitledSection } from "@/components/ui/section/section";
import { AssetsSection } from "@/features/net-worth/assets-section/assets-section";
import { DebtsSection } from "@/features/net-worth/debts-section/debts-section";
import { NetWorthCompositionChart } from "@/features/net-worth/net-worth-composition-chart";
import {
  NetWorthPace,
  NetWorthPaceSkeleton,
} from "@/features/net-worth/net-worth-pace/net-worth-pace";
import { NetWorthStats } from "@/features/net-worth/net-worth-stats/net-worth-stats";
import { OpenBalancesToggle } from "@/features/net-worth/open-balances-toggle/open-balances-toggle";
import { BalanceItemsSkeleton } from "./net-worth-page-pending";

export function NetWorthPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <PageHeader title={t("netWorth.title")}>
        <QueryBoundary fallback={null} error={null}>
          <OpenBalancesToggle />
        </QueryBoundary>
      </PageHeader>

      <QueryBoundary
        fallback={<SummaryStatsSkeleton items={3} />}
        errorSubject={t("netWorth.title")}
      >
        <NetWorthStats />
      </QueryBoundary>

      <div className="grid gap-5 lg:grid-cols-2">
        <TitledSection title={t("netWorth.trend")} bodyGap="md">
          <QueryBoundary
            fallback={
              <>
                <ChartSkeleton legend />
                <NetWorthPaceSkeleton />
              </>
            }
            errorSubject={t("netWorth.trend")}
          >
            <NetWorthHistoryChart pace />
            <NetWorthPace />
          </QueryBoundary>
        </TitledSection>
        <TitledSection title={t("netWorth.composition")} bodyGap="md">
          <QueryBoundary
            fallback={<ChartSkeleton legend />}
            errorSubject={t("netWorth.composition")}
          >
            <NetWorthCompositionChart />
          </QueryBoundary>
        </TitledSection>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <QueryBoundary fallback={<BalanceItemsSkeleton />} errorSubject={t("netWorth.assets")}>
          <AssetsSection />
        </QueryBoundary>
        <QueryBoundary fallback={<BalanceItemsSkeleton />} errorSubject={t("netWorth.debts")}>
          <DebtsSection />
        </QueryBoundary>
      </div>
    </div>
  );
}
