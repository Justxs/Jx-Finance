import { useSearch } from "@tanstack/react-router";
import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { PagePending } from "@/components/route-pending/route-pending";
import { ShareRowsSkeleton } from "@/components/share-row/share-row";
import { SummaryStatsSkeleton } from "@/components/summary-stats/summary-stats";
import {
  ButtonSkeleton,
  SectionSkeleton,
  Skeleton,
  TextSkeleton,
} from "@/components/ui/skeleton/skeleton";
import { SplitColumns } from "@/components/ui/split-columns/split-columns";
import { TableSkeleton } from "@/components/ui/table/table";
import { MONEY_FLOW_HEIGHT } from "@/features/reports/money-flow/money-flow-graph";
import { detectPreset } from "@/features/reports/report-filters/date-range-presets";
import { reportRange } from "@/features/reports/report-queries";
import { useSettings, useTodayDate } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

const filterWidths = ["sm:w-44", "sm:w-64", "sm:w-52"] as const;

function YearReviewSkeleton() {
  return (
    <SectionSkeleton>
      <TableSkeleton rows={12} columns={5} />
      <div className="space-y-2">
        <TextSkeleton size="sm" width="w-40" />
        <ButtonSkeleton size="sm" className="w-52" />
      </div>
    </SectionSkeleton>
  );
}

function ReceiptItemsSkeleton() {
  return (
    <SectionSkeleton>
      <TextSkeleton size="sm" width="w-3/4" />
      <div className="max-w-xs space-y-1.5">
        <TextSkeleton size="label" />
        <Skeleton className="h-9 w-full rounded-lg pointer-coarse:h-11" />
      </div>
      <TableSkeleton rows={5} columns={3} lines={2} />
    </SectionSkeleton>
  );
}

export function ReportsPending() {
  const compared = useSearch({
    strict: false,
    select: (search) => search.comparison !== undefined && search.comparison !== "none",
  });
  const searchFrom = useSearch({ strict: false, select: (search) => search.dateFrom });
  const searchTo = useSearch({ strict: false, select: (search) => search.dateTo });
  const { features } = useSettings();
  const today = useTodayDate();
  const { dateFrom, dateTo } = reportRange({ dateFrom: searchFrom, dateTo: searchTo }, today);
  const preset = detectPreset(dateFrom, dateTo, today);
  const wholeYear = preset === "thisYear" || preset === "lastYear";

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
      {wholeYear && features.netWorth ? (
        <SectionSkeleton>
          <TextSkeleton size="xs" width="w-56" />
        </SectionSkeleton>
      ) : null}
      {wholeYear ? <YearReviewSkeleton /> : null}
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
          {features.locations ? (
            <SectionSkeleton>
              <ShareRowsSkeleton rows={5} />
            </SectionSkeleton>
          ) : null}
          {features.receiptReading && features.attachments ? <ReceiptItemsSkeleton /> : null}
        </div>
      </SplitColumns>
      <SectionSkeleton className="hidden lg:block">
        <ChartSkeleton height={MONEY_FLOW_HEIGHT} />
      </SectionSkeleton>
    </PagePending>
  );
}
