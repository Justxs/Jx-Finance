import { useSearch } from "@tanstack/react-router";
import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { PagePending } from "@/components/route-pending/route-pending";
import { ShareRowsSkeleton } from "@/components/share-row/share-row";
import { SummaryStatsSkeleton } from "@/components/summary-stats/summary-stats";
import { SectionSkeleton, Skeleton, TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { SplitColumns } from "@/components/ui/split-columns/split-columns";
import { MONEY_FLOW_HEIGHT } from "@/features/reports/money-flow/money-flow-graph";
import { cn } from "@/lib/utils";

const filterWidths = ["sm:w-44", "sm:w-64", "sm:w-52"] as const;

export function ReportsPending() {
  const compared = useSearch({
    strict: false,
    select: (search) => search.comparison !== undefined && search.comparison !== "none",
  });

  return (
    <PagePending actions={1}>
      <div aria-hidden="true" className="flex flex-wrap items-end gap-x-4 gap-y-3">
        {filterWidths.map((width) => (
          <div key={width} className={cn("w-full space-y-1.5", width)}>
            <TextSkeleton size="label" />
            <Skeleton className="h-9 w-full rounded-lg pointer-coarse:h-11" />
          </div>
        ))}
      </div>
      {compared ? <TextSkeleton size="sm" width="w-64" /> : null}
      <SummaryStatsSkeleton items={2} />
      <SplitColumns className="gap-x-5 gap-y-5 lg:items-start">
        <div className="space-y-5">
          <SectionSkeleton>
            <ShareRowsSkeleton rows={6} />
          </SectionSkeleton>
          <SectionSkeleton>
            <ShareRowsSkeleton rows={2} />
          </SectionSkeleton>
          <SectionSkeleton>
            <ShareRowsSkeleton rows={4} />
            <TextSkeleton size="xs" className="mt-3" width="w-3/4" />
          </SectionSkeleton>
        </div>
        <div className="space-y-5">
          <SectionSkeleton>
            <ChartSkeleton height={280} legend />
          </SectionSkeleton>
          <SectionSkeleton>
            <ShareRowsSkeleton rows={8} />
            <TextSkeleton size="xs" className="mt-3" width="w-3/4" />
          </SectionSkeleton>
        </div>
      </SplitColumns>
      <SectionSkeleton className="hidden lg:block">
        <ChartSkeleton height={MONEY_FLOW_HEIGHT} />
      </SectionSkeleton>
    </PagePending>
  );
}
