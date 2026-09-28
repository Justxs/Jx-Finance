import { useSearch } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { DashboardCard } from "@/api/generated/model";
import { ShareRowsSkeleton } from "@/components/breakdown-list/share-row";
import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { PagePending } from "@/components/route-pending/route-pending";
import { Section } from "@/components/ui/section/section";
import {
  ButtonSkeleton,
  IconButtonSkeleton,
  RowsSkeleton,
  SectionSkeleton,
  TextSkeleton,
} from "@/components/ui/skeleton/skeleton";
import { MonthCloseReviewSkeleton } from "@/features/month-close/month-close-review/month-close-review-skeleton";
import { useFeature } from "@/hooks/use-settings";

export const dashboardGrid = "grid gap-4 lg:grid-cols-6 xl:grid-cols-12 xl:gap-5";

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
  Exclude<DashboardCard, "summary" | "recentTransactions">,
  ReactNode
> = {
  monthlyTrend: <ChartSkeleton height={300} legend />,
  spendingByCategory: <ComparedShareRowsSkeleton />,
  spendingPace: <ChartSkeleton legend />,
  budgets: <ShareRowsSkeleton rows={5} share={false} />,
  netWorth: <NetWorthSkeleton />,
  accounts: <ShareRowsSkeleton rows={6} />,
  upcomingBills: <RowsSkeleton rows={5} />,
};

export function DashboardSkeleton() {
  return (
    <div className={dashboardGrid} aria-hidden="true">
      <Section className="lg:col-span-6 xl:col-span-4">
        <DashboardStatsSkeleton />
      </Section>
      <SectionSkeleton className="lg:col-span-6 xl:col-span-8">
        {cardSkeletons.monthlyTrend}
      </SectionSkeleton>
      <SectionSkeleton className="lg:col-span-3 xl:col-span-4">
        {cardSkeletons.spendingByCategory}
      </SectionSkeleton>
      <SectionSkeleton className="lg:col-span-3 xl:col-span-4">
        {cardSkeletons.spendingPace}
      </SectionSkeleton>
      <SectionSkeleton className="lg:col-span-6 xl:col-span-4">
        {cardSkeletons.budgets}
      </SectionSkeleton>
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
      {reviewing ? <MonthCloseReviewSkeleton /> : null}
      <DashboardSkeleton />
    </PagePending>
  );
}
