import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DashboardCard as DashboardCardId } from "@/api/generated/model";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Section } from "@/components/ui/section/section";
import { useTodayDate } from "@/hooks/use-settings";
import type { Translate, TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AccountBalances } from "../account-balances/account-balances";
import { BudgetSnapshot } from "../budget-snapshot/budget-snapshot";
import { CategoryBreakdownChart } from "../category-breakdown-chart/category-breakdown-chart";
import { cardSkeletons, DashboardStatsSkeleton } from "../dashboard-page/dashboard-pending";
import { pastMonthEnd } from "../dashboard-queries";
import { DashboardSection } from "../dashboard-section/dashboard-section";
import { DashboardStats } from "../dashboard-stats/dashboard-stats";
import { MonthlyTrendChart } from "../monthly-trend-chart/monthly-trend-chart";
import { NetWorthMonth } from "../net-worth-month/net-worth-month";
import { RecentTransactionsList } from "../recent-transactions-list/recent-transactions-list";
import { SpendingPaceChart } from "../spending-pace-chart";
import { UpcomingBills } from "../upcoming-bills/upcoming-bills";

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
  content: (view: CardView) => ReactNode;
}

const sectionCards: Record<
  Exclude<DashboardCardId, "summary" | "recentTransactions">,
  SectionCard
> = {
  monthlyTrend: {
    span: "wide",
    link: { to: "/reports", label: "nav.reports" },
    content: ({ month }) => <MonthlyTrendChart month={month} />,
  },
  spendingByCategory: {
    span: "third",
    content: ({ month }) => <CategoryBreakdownChart month={month} />,
  },
  spendingPace: {
    span: "third",
    content: ({ month }) => <SpendingPaceChart month={month} />,
  },
  budgets: {
    span: "narrow",
    link: { to: "/budgets", label: "nav.budgets" },
    content: ({ until }) => <BudgetSnapshot asOf={until} />,
  },
  netWorth: {
    span: "wide",
    link: { to: "/net-worth", label: "nav.netWorth" },
    content: ({ month, until }) => <NetWorthMonth month={month} until={until} />,
  },
  accounts: {
    span: "narrow",
    link: { to: "/accounts", label: "nav.accounts" },
    content: ({ until }) => <AccountBalances asOf={until} />,
  },
  upcomingBills: {
    span: "narrow",
    link: { to: "/recurring-bills", label: "nav.recurringBills" },
    content: ({ until }) => (until ? <CurrentMonthOnly /> : <UpcomingBills />),
  },
};

export function dashboardCardTitle(t: Translate, card: DashboardCardId): string {
  return t(titleKeys[card]);
}

interface Props {
  card: DashboardCardId;
  month: string;
  widen?: boolean;
}

export function DashboardCard({ card, month, widen = false }: Readonly<Props>) {
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
  const span = widen ? "wide" : section.span;
  return (
    <DashboardSection
      className={cn(
        span === "third" && third,
        span === "wide" && wide,
        span === "narrow" && narrow,
      )}
      title={title}
      to={section.link?.to}
      linkLabel={section.link ? t(section.link.label) : undefined}
    >
      <QueryBoundary fallback={cardSkeletons[card]} errorSubject={title}>
        {section.content({ month, until })}
      </QueryBoundary>
    </DashboardSection>
  );
}
