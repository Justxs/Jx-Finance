import { PageHeaderSkeleton } from "@/components/page-header/page-header";
import { PagePending } from "@/components/route-pending/route-pending";
import { ShareRowsSkeleton } from "@/components/share-row/share-row";
import { SummaryStatsSkeleton } from "@/components/summary-stats/summary-stats";
import { Section } from "@/components/ui/section/section";
import {
  ButtonSkeleton,
  IconButtonSkeleton,
  RowsSkeleton,
  SectionSkeleton,
  Skeleton,
  TextSkeleton,
} from "@/components/ui/skeleton/skeleton";
import { SplitColumns } from "@/components/ui/split-columns/split-columns";
import { useFeature } from "@/hooks/use-settings";

function StepperSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-1">
      <IconButtonSkeleton size="md" />
      <TextSkeleton size="sm" className="w-32 justify-center" width="w-24" />
      <IconButtonSkeleton size="md" />
    </div>
  );
}

export function MonthBodySkeleton() {
  const billsShown = useFeature("recurringBills");

  return (
    <>
      <Section aria-hidden="true" className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
          <Skeleton className="mt-1 size-5 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <TextSkeleton size="title" width="w-56" />
            <TextSkeleton size="sm" className="mt-0.5" width="w-36" />
          </div>
        </div>
        <ButtonSkeleton className="ml-auto w-40" />
      </Section>
      <SectionSkeleton>
        <RowsSkeleton rows={2} />
      </SectionSkeleton>
      <SectionSkeleton>
        <RowsSkeleton rows={3} />
      </SectionSkeleton>
      {billsShown ? (
        <SectionSkeleton>
          <RowsSkeleton rows={1} />
        </SectionSkeleton>
      ) : null}
      <SectionSkeleton>
        <RowsSkeleton rows={2} />
      </SectionSkeleton>
      <Section aria-hidden="true">
        <SplitColumns className="gap-y-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="min-w-0">
            <TextSkeleton size="title" width="w-32" />
            <div className="mt-2">
              <SummaryStatsSkeleton items={4} className="lg:grid-cols-1" />
            </div>
          </div>
          <div className="min-w-0">
            <TextSkeleton size="title" width="w-24" />
            <div className="mt-2">
              <ShareRowsSkeleton rows={3} share={false} />
            </div>
          </div>
        </SplitColumns>
        <div className="mt-5 space-y-4 border-t pt-5">
          <div className="space-y-1.5">
            <TextSkeleton size="label" width="w-16" />
            <Skeleton className="h-9 w-full rounded-lg pointer-coarse:h-11" />
          </div>
          <div className="flex justify-end pt-2">
            <ButtonSkeleton className="w-44" />
          </div>
        </div>
      </Section>
    </>
  );
}

export function MonthPagePending() {
  return (
    <PagePending header={<PageHeaderSkeleton actions={<StepperSkeleton />} />}>
      <MonthBodySkeleton />
    </PagePending>
  );
}
