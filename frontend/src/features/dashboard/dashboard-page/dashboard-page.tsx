import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/page-header";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonthLabel } from "@/hooks/use-formatters";
import { CategoryBreakdownChart } from "../category-breakdown-chart";
import { DashboardStats } from "../dashboard-stats";
import { MonthlyTrendChart } from "../monthly-trend-chart";
import { RecentTransactionsList } from "../recent-transactions-list";

export function DashboardPage() {
  const { t } = useTranslation();
  const monthLabel = useMonthLabel();
  const month = monthLabel();

  return (
    <div className="space-y-10">
      <PageHeader title={t("dashboard.title")} description={month} />

      <QueryBoundary fallback={<Skeleton className="h-24 w-full" />}>
        <DashboardStats />
      </QueryBoundary>

      <div className="split-columns gap-y-10">
        <section className="section">
          <h2 className="section-title mb-4">{t("dashboard.spendingByCategory")}</h2>
          <QueryBoundary fallback={<Skeleton className="h-64 w-full" />}>
            <CategoryBreakdownChart />
          </QueryBoundary>
        </section>
        <section className="section">
          <h2 className="section-title mb-4">{t("dashboard.monthlyTrend")}</h2>
          <QueryBoundary fallback={<Skeleton className="h-64 w-full" />}>
            <MonthlyTrendChart />
          </QueryBoundary>
        </section>
      </div>

      <QueryBoundary fallback={<Skeleton className="h-64 w-full" />}>
        <RecentTransactionsList />
      </QueryBoundary>
    </div>
  );
}
