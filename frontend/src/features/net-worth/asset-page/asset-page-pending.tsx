import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { RecordRowsSkeleton } from "@/components/record-row/record-row";
import { SummaryStatsSkeleton } from "@/components/summary-stats/summary-stats";
import { Section } from "@/components/ui/section/section";
import { ButtonSkeleton, SectionSkeleton, TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { DetailPagePending } from "@/features/net-worth/detail-page/detail-page";

export function ValuationsSkeleton() {
  return (
    <Section aria-hidden="true">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <TextSkeleton size="title" className="min-w-0 flex-1" width="w-40" />
        <ButtonSkeleton size="sm" className="w-32" />
      </div>
      <TextSkeleton size="xs" width="w-3/4 max-w-prose" />
      <RecordRowsSkeleton rows={4} />
    </Section>
  );
}

export function AssetPending() {
  return (
    <DetailPagePending>
      <SummaryStatsSkeleton items={3} />
      <SectionSkeleton>
        <ChartSkeleton legend />
      </SectionSkeleton>
      <ValuationsSkeleton />
    </DetailPagePending>
  );
}
