import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/page-header";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryBreakdownChart } from "./category-breakdown-chart";
import { DashboardStats } from "./dashboard-stats";
import { MonthlyTrendChart } from "./monthly-trend-chart";
import { RecentTransactionsList } from "./recent-transactions-list";

export function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboard.title")} />

      <QueryBoundary fallback={<Skeleton className="h-28 w-full" />}>
        <DashboardStats />
      </QueryBoundary>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 font-semibold">{t("dashboard.spendingByCategory")}</h2>
          <QueryBoundary fallback={<Skeleton className="h-64 w-full" />}>
            <CategoryBreakdownChart />
          </QueryBoundary>
        </section>
        <section className="card p-6">
          <h2 className="mb-4 font-semibold">{t("dashboard.monthlyTrend")}</h2>
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
