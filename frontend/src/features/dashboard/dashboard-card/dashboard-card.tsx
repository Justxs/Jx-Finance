import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DashboardCard as DashboardCardId } from "@/api/generated/model";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Section } from "@/components/ui/section/section";
import { RowsSkeleton, Skeleton } from "@/components/ui/skeleton/skeleton";
import { NetWorthHistoryChart } from "@/features/net-worth/net-worth-history-chart";
import { useTodayDate } from "@/hooks/use-settings";
import type { Translate, TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AccountBalances } from "../account-balances/account-balances";
import { BudgetSnapshot } from "../budget-snapshot/budget-snapshot";
import { CategoryBreakdownChart } from "../category-breakdown-chart/category-breakdown-chart";
import { pastMonthEnd } from "../dashboard-queries";
import { DashboardSection } from "../dashboard-section/dashboard-section";
import { DashboardStats, DashboardStatsSkeleton } from "../dashboard-stats/dashboard-stats";
import { MonthlyTrendChart } from "../monthly-trend-chart/monthly-trend-chart";
import { RecentTransactionsList } from "../recent-transactions-list/recent-transactions-list";
import { SpendingPaceChart } from "../spending-pace-chart";
import { UpcomingBills } from "../upcoming-bills/upcoming-bills";

interface ChartSkeletonProps {
  legend?: boolean;
  tall?: boolean;
}

export function ChartSkeleton({ legend = false, tall = false }: Readonly<ChartSkeletonProps>) {
  return (
    <div aria-hidden="true" className="space-y-3">
      {legend ? (
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16 rounded-sm" />
          <Skeleton className="h-4 w-16 rounded-sm" />
        </div>
      ) : null}
      {tall ? (
        <Skeleton className="h-75 w-full rounded-sm" />
      ) : (
        <Skeleton className="h-60 w-full rounded-sm" />
      )}
    </div>
  );
}

export function ShareRowsSkeleton({ rows }: Readonly<{ rows: number }>) {
  return (
    <ul aria-hidden="true" className="space-y-3.5">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index}>
          <div className="flex h-5 items-center gap-3">
            <Skeleton className="h-4 w-2/5 rounded-sm" />
            <Skeleton className="ml-auto h-4 w-20 rounded-sm" />
          </div>
          <Skeleton className="mt-1.5 h-1.5 w-full rounded-none" />
        </li>
      ))}
    </ul>
  );
}

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

interface CardView {
  month: string;
  until: string | undefined;
}

function CurrentMonthOnly() {
  const { t } = useTranslation();
  return <EmptyText>{t("dashboard.billsCurrentOnly")}</EmptyText>;
}

interface SectionCard {
  span: "third" | "wide" | "narrow";
  link?: { to: LinkProps["to"]; label: TranslationKey };
  fallback: ReactNode;
  content: (view: CardView) => ReactNode;
}

const sectionCards: Record<
  Exclude<DashboardCardId, "summary" | "recentTransactions">,
  SectionCard
> = {
  monthlyTrend: {
    span: "wide",
    link: { to: "/reports", label: "nav.reports" },
    fallback: <ChartSkeleton legend tall />,
    content: ({ month }) => <MonthlyTrendChart month={month} />,
  },
  spendingByCategory: {
    span: "third",
    fallback: <ShareRowsSkeleton rows={6} />,
    content: ({ month }) => <CategoryBreakdownChart month={month} />,
  },
  spendingPace: {
    span: "third",
    fallback: <ChartSkeleton legend />,
    content: ({ month }) => <SpendingPaceChart month={month} />,
  },
  budgets: {
    span: "narrow",
    link: { to: "/budgets", label: "nav.budgets" },
    fallback: <ShareRowsSkeleton rows={5} />,
    content: ({ until }) => <BudgetSnapshot asOf={until} />,
  },
  netWorth: {
    span: "wide",
    link: { to: "/net-worth", label: "nav.netWorth" },
    fallback: <ChartSkeleton />,
    content: ({ until }) => <NetWorthHistoryChart until={until} />,
  },
  accounts: {
    span: "narrow",
    link: { to: "/accounts", label: "nav.accounts" },
    fallback: <ShareRowsSkeleton rows={6} />,
    content: ({ until }) => <AccountBalances asOf={until} />,
  },
  upcomingBills: {
    span: "narrow",
    link: { to: "/recurring-bills", label: "nav.recurringBills" },
    fallback: <RowsSkeleton rows={5} />,
    content: ({ until }) => (until ? <CurrentMonthOnly /> : <UpcomingBills />),
  },
};

export function dashboardCardTitle(t: Translate, card: DashboardCardId): string {
  return t(titleKeys[card]);
}

interface Props {
  card: DashboardCardId;
  month: string;
}

export function DashboardCard({ card, month }: Readonly<Props>) {
  const { t } = useTranslation();
  const until = pastMonthEnd(month, useTodayDate());
  const title = dashboardCardTitle(t, card);

  if (card === "summary") {
    return (
      <Section className={narrow} aria-label={title}>
        <QueryBoundary fallback={<DashboardStatsSkeleton />} errorSubject={title}>
          <DashboardStats month={month} />
        </QueryBoundary>
      </Section>
    );
  }

  if (card === "recentTransactions") {
    return <RecentTransactionsList month={month} className={wide} />;
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
        {section.content({ month, until })}
      </QueryBoundary>
    </DashboardSection>
  );
}
