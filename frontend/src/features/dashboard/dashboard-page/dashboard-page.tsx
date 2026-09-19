import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/page-header";
import { QueryBoundary } from "@/components/query-boundary";
import { RowsSkeleton, Skeleton } from "@/components/ui/skeleton";
import { NetWorthHistoryChart } from "@/features/net-worth/net-worth-history-chart";
import { useMonthLabel } from "@/hooks/use-formatters";
import { useTodayDate } from "@/hooks/use-settings";
import { AccountBalances } from "../account-balances";
import { BudgetSnapshot } from "../budget-snapshot";
import { CategoryBreakdownChart } from "../category-breakdown-chart";
import { DashboardSection } from "../dashboard-section";
import { DashboardStats } from "../dashboard-stats";
import { MonthlyTrendChart } from "../monthly-trend-chart";
import { RecentTransactionsList } from "../recent-transactions-list";
import { SpendingPaceChart } from "../spending-pace-chart";
import { UpcomingBills } from "../upcoming-bills";

const chartFallback = <Skeleton className="h-64 w-full rounded-sm" />;
const third = "lg:col-span-3 xl:col-span-4";
const wide = "lg:col-span-6 xl:col-span-8";
const narrow = "lg:col-span-6 xl:col-span-4";

export function DashboardPage() {
  const { t } = useTranslation();
  const monthLabel = useMonthLabel();
  const month = monthLabel(useTodayDate());

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboard.title")} description={month} />

      <div className="grid gap-4 lg:grid-cols-6 xl:grid-cols-12 xl:gap-5">
        <section className={`panel ${narrow}`} aria-label={t("dashboard.totalBalance")}>
          <QueryBoundary
            fallback={<Skeleton className="h-64 w-full rounded-sm" />}
            errorSubject={t("dashboard.totalBalance")}
          >
            <DashboardStats />
          </QueryBoundary>
        </section>
        <DashboardSection
          className={wide}
          title={t("dashboard.monthlyTrend")}
          to="/reports"
          linkLabel={t("nav.reports")}
        >
          <QueryBoundary fallback={chartFallback} errorSubject={t("dashboard.monthlyTrend")}>
            <MonthlyTrendChart />
          </QueryBoundary>
        </DashboardSection>

        <DashboardSection className={third} title={t("dashboard.spendingByCategory")}>
          <QueryBoundary
            fallback={<RowsSkeleton rows={6} />}
            errorSubject={t("dashboard.spendingByCategory")}
          >
            <CategoryBreakdownChart />
          </QueryBoundary>
        </DashboardSection>
        <DashboardSection className={third} title={t("dashboard.pace.title")}>
          <QueryBoundary fallback={chartFallback} errorSubject={t("dashboard.pace.title")}>
            <SpendingPaceChart />
          </QueryBoundary>
        </DashboardSection>
        <DashboardSection
          className={narrow}
          title={t("dashboard.budgets")}
          to="/budgets"
          linkLabel={t("nav.budgets")}
        >
          <QueryBoundary fallback={<RowsSkeleton rows={5} />} errorSubject={t("dashboard.budgets")}>
            <BudgetSnapshot />
          </QueryBoundary>
        </DashboardSection>

        <DashboardSection
          className={wide}
          title={t("charts.netWorthLabel")}
          to="/net-worth"
          linkLabel={t("nav.netWorth")}
        >
          <QueryBoundary fallback={chartFallback} errorSubject={t("charts.netWorthLabel")}>
            <NetWorthHistoryChart />
          </QueryBoundary>
        </DashboardSection>
        <DashboardSection
          className={narrow}
          title={t("dashboard.accounts")}
          to="/accounts"
          linkLabel={t("nav.accounts")}
        >
          <QueryBoundary
            fallback={<RowsSkeleton rows={5} />}
            errorSubject={t("dashboard.accounts")}
          >
            <AccountBalances />
          </QueryBoundary>
        </DashboardSection>

        <RecentTransactionsList className={wide} />
        <DashboardSection
          className={narrow}
          title={t("dashboard.upcomingBills")}
          to="/recurring-bills"
          linkLabel={t("nav.recurringBills")}
        >
          <QueryBoundary
            fallback={<RowsSkeleton rows={5} />}
            errorSubject={t("dashboard.upcomingBills")}
          >
            <UpcomingBills />
          </QueryBoundary>
        </DashboardSection>
      </div>
    </div>
  );
}
