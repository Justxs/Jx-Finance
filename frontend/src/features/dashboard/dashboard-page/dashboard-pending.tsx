import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { getDashboardLayoutQueryKey } from "@/api/generated";
import type { DashboardCard, DashboardLayoutResponse } from "@/api/generated/model";
import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { PagePending } from "@/components/route-pending/route-pending";
import { ShareRowsSkeleton } from "@/components/share-row/share-row";
import { Section } from "@/components/ui/section/section";
import {
  ButtonSkeleton,
  IconButtonSkeleton,
  RowsSkeleton,
  SectionSkeleton,
  TextSkeleton,
} from "@/components/ui/skeleton/skeleton";
import { shownCards } from "@/features/dashboard/dashboard-layout";
import { MonthCloseLineSkeleton } from "@/features/month-close/month-close-line/month-close-line";
import { useFeature, useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

export const dashboardGrid = "grid gap-4 lg:grid-cols-6 xl:grid-cols-12 xl:gap-5";

const third = "lg:col-span-3 xl:col-span-4";
const wide = "lg:col-span-6 xl:col-span-8";
const narrow = "lg:col-span-6 xl:col-span-4";

type CardSpan = "third" | "wide" | "narrow";

const cardSpans: Record<DashboardCard, CardSpan> = {
  gettingStarted: "wide",
  summary: "narrow",
  monthlyTrend: "wide",
  spendingByCategory: "third",
  spendingPace: "third",
  budgets: "narrow",
  netWorth: "wide",
  accounts: "narrow",
  recentTransactions: "wide",
  upcomingBills: "narrow",
  cashFlow: "narrow",
  goals: "narrow",
};

const defaultSkeletonCards: DashboardCard[] = [
  "summary",
  "monthlyTrend",
  "spendingByCategory",
  "spendingPace",
  "budgets",
];

export function cardSpan(card: DashboardCard, cards: readonly DashboardCard[]): CardSpan {
  const widened = card === "spendingByCategory" && !cards.includes("spendingPace");
  return widened ? "wide" : cardSpans[card];
}

export function DashboardStatsSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-full flex-col gap-6">
      <div>
        <TextSkeleton size="sm" width="w-28" />
        <TextSkeleton size="stat-lg" className="mt-1" width="w-52" />
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-center gap-x-8 gap-y-5">
        <svg viewBox="0 0 100 100" className="size-40 shrink-0 animate-pulse">
          <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" className="stroke-border" />
        </svg>
        <div className="min-w-48 flex-1 space-y-2.5">
          {["income", "expense", "net"].map((row) => (
            <div key={row} className="flex items-center justify-between gap-4">
              <TextSkeleton size="sm" width="w-20" />
              <TextSkeleton size="xl" width="w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComparedShareRowsSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <TextSkeleton size="xs" width="w-48" />
      <ShareRowsSkeleton rows={6} compared />
    </div>
  );
}

function NetWorthSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <TextSkeleton size="sm" width="w-48" />
      <ChartSkeleton />
    </div>
  );
}

export const cardSkeletons: Record<
  Exclude<DashboardCard, "gettingStarted" | "summary" | "recentTransactions">,
  ReactNode
> = {
  monthlyTrend: <ChartSkeleton height={300} legend />,
  spendingByCategory: <ComparedShareRowsSkeleton />,
  spendingPace: <ChartSkeleton legend />,
  budgets: <ShareRowsSkeleton rows={5} share={false} />,
  netWorth: <NetWorthSkeleton />,
  accounts: <ShareRowsSkeleton rows={6} wideAmount />,
  upcomingBills: <RowsSkeleton rows={5} />,
  cashFlow: <RowsSkeleton rows={2} lines={2} />,
  goals: <ShareRowsSkeleton rows={3} share={false} />,
};

interface CardSkeletonProps {
  card: DashboardCard;
  span: CardSpan;
}

function CardSkeleton({ card, span }: Readonly<CardSkeletonProps>) {
  if (card === "gettingStarted") {
    return null;
  }
  if (card === "summary") {
    return (
      <Section className={narrow}>
        <DashboardStatsSkeleton />
      </Section>
    );
  }
  return (
    <SectionSkeleton
      className={cn(
        span === "third" && third,
        span === "wide" && wide,
        span === "narrow" && narrow,
      )}
    >
      {card === "recentTransactions" ? <RowsSkeleton rows={6} lines={2} /> : cardSkeletons[card]}
    </SectionSkeleton>
  );
}

export function DashboardSkeleton() {
  const layout = useQueryClient().getQueryData<DashboardLayoutResponse>(
    getDashboardLayoutQueryKey(),
  );
  const { features } = useSettings();
  const cards = layout ? shownCards(layout, features) : defaultSkeletonCards;

  return (
    <div className={dashboardGrid} aria-hidden="true">
      {cards.map((card) => (
        <CardSkeleton key={card} card={card} span={cardSpan(card, cards)} />
      ))}
    </div>
  );
}

function MonthHeaderSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <TextSkeleton size="stat-lg" width="w-64" />
      <div className="flex items-center gap-1">
        <ButtonSkeleton className="invisible w-28" />
        <IconButtonSkeleton size="md" />
        <IconButtonSkeleton size="md" />
      </div>
    </div>
  );
}

export function DashboardPending() {
  const month = useSearch({ strict: false, select: (search) => search.month });
  const reviewing = useFeature("monthClose") && month !== undefined;

  return (
    <PagePending className="space-y-6" header={<MonthHeaderSkeleton />}>
      {reviewing ? <MonthCloseLineSkeleton /> : null}
      <DashboardSkeleton />
    </PagePending>
  );
}
