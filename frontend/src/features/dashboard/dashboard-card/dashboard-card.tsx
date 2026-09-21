import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DashboardCard as DashboardCardId } from "@/api/generated/model";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Panel } from "@/components/ui/section/section";
import { RowsSkeleton, Skeleton } from "@/components/ui/skeleton/skeleton";
import { NetWorthHistoryChart } from "@/features/net-worth/net-worth-history-chart";
import type { Translate, TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AccountBalances } from "../account-balances/account-balances";
import { BudgetSnapshot } from "../budget-snapshot/budget-snapshot";
import { CategoryBreakdownChart } from "../category-breakdown-chart/category-breakdown-chart";
import { DashboardSection } from "../dashboard-section/dashboard-section";
import { DashboardStats } from "../dashboard-stats/dashboard-stats";
import { MonthlyTrendChart } from "../monthly-trend-chart/monthly-trend-chart";
import { RecentTransactionsList } from "../recent-transactions-list/recent-transactions-list";
import { SpendingPaceChart } from "../spending-pace-chart";
import { UpcomingBills } from "../upcoming-bills/upcoming-bills";

const chartFallback = <Skeleton className="h-64 w-full rounded-sm" />;
const third = "lg:col-span-3 xl:col-span-4";
const wide = "lg:col-span-6 xl:col-span-8";
const narrow = "lg:col-span-6 xl:col-span-4";

const titleKeys = {
  summary: "dashboard.totalBalance",
  monthlyTrend: "dashboard.monthlyTrend",
  spendingByCategory: "dashboard.spendingByCategory",
  spendingPace: "dashboard.pace.title",
  budgets: "dashboard.budgets",
  netWorth: "charts.netWorthLabel",
  accounts: "dashboard.accounts",
  recentTransactions: "dashboard.recent",
  upcomingBills: "dashboard.upcomingBills",
} as const satisfies Record<DashboardCardId, TranslationKey>;

interface SectionCard {
  span: "third" | "wide" | "narrow";
  link?: { to: LinkProps["to"]; label: TranslationKey };
  fallback: ReactNode;
  content: ReactNode;
}

const sectionCards: Record<
  Exclude<DashboardCardId, "summary" | "recentTransactions">,
  SectionCard
> = {
  monthlyTrend: {
    span: "wide",
    link: { to: "/reports", label: "nav.reports" },
    fallback: chartFallback,
    content: <MonthlyTrendChart />,
  },
  spendingByCategory: {
    span: "third",
    fallback: <RowsSkeleton rows={6} />,
    content: <CategoryBreakdownChart />,
  },
  spendingPace: { span: "third", fallback: chartFallback, content: <SpendingPaceChart /> },
  budgets: {
    span: "narrow",
    link: { to: "/budgets", label: "nav.budgets" },
    fallback: <RowsSkeleton rows={5} />,
    content: <BudgetSnapshot />,
  },
  netWorth: {
    span: "wide",
    link: { to: "/net-worth", label: "nav.netWorth" },
    fallback: chartFallback,
    content: <NetWorthHistoryChart />,
  },
  accounts: {
    span: "narrow",
    link: { to: "/accounts", label: "nav.accounts" },
    fallback: <RowsSkeleton rows={5} />,
    content: <AccountBalances />,
  },
  upcomingBills: {
    span: "narrow",
    link: { to: "/recurring-bills", label: "nav.recurringBills" },
    fallback: <RowsSkeleton rows={5} />,
    content: <UpcomingBills />,
  },
};

export function dashboardCardTitle(t: Translate, card: DashboardCardId): string {
  return t(titleKeys[card]);
}

interface Props {
  card: DashboardCardId;
}

export function DashboardCard({ card }: Readonly<Props>) {
  const { t } = useTranslation();
  const title = dashboardCardTitle(t, card);

  if (card === "summary") {
    return (
      <Panel as="section" className={narrow} aria-label={title}>
        <QueryBoundary fallback={chartFallback} errorSubject={title}>
          <DashboardStats />
        </QueryBoundary>
      </Panel>
    );
  }

  if (card === "recentTransactions") {
    return <RecentTransactionsList className={wide} />;
  }

  const section = sectionCards[card];
  return (
    <DashboardSection
      className={cn(
        section.span === "third" && third,
        section.span === "wide" && wide,
        section.span === "narrow" && narrow,
      )}
      title={title}
      to={section.link?.to}
      linkLabel={section.link ? t(section.link.label) : undefined}
    >
      <QueryBoundary fallback={section.fallback} errorSubject={title}>
        {section.content}
      </QueryBoundary>
    </DashboardSection>
  );
}
