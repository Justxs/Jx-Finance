import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { PagePending } from "@/components/route-pending/route-pending";
import { SummaryStatsSkeleton } from "@/components/summary-stats/summary-stats";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import {
  ButtonSkeleton,
  IconButtonSkeleton,
  SectionSkeleton,
  TextSkeleton,
  rowWidth,
} from "@/components/ui/skeleton/skeleton";

export function HoldingsSectionSkeleton() {
  return (
    <Section aria-hidden="true">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <TextSkeleton size="title" className="min-w-0 flex-1" width="w-32" />
        <TextSkeleton width="w-24" />
        <ButtonSkeleton size="sm" className="w-28" />
      </div>
      <Rows>
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <TextSkeleton size="sm" width={rowWidth(index)} />
              <TextSkeleton size="xs" width="w-1/2" />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <TextSkeleton className="w-24 justify-end" width="w-20" />
              <IconButtonSkeleton size="md" />
              <IconButtonSkeleton size="md" />
              <IconButtonSkeleton size="md" />
            </div>
          </li>
        ))}
      </Rows>
    </Section>
  );
}

export function NetWorthPending() {
  return (
    <PagePending>
      <SummaryStatsSkeleton items={3} />
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionSkeleton>
          <ChartSkeleton />
        </SectionSkeleton>
        <SectionSkeleton>
          <ChartSkeleton legend />
        </SectionSkeleton>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <HoldingsSectionSkeleton />
        <HoldingsSectionSkeleton />
      </div>
    </PagePending>
  );
}
