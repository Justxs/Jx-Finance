import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { ListSectionSkeleton } from "@/components/list-section/list-section";
import { PagePending } from "@/components/route-pending/route-pending";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import {
  IconButtonSkeleton,
  SectionSkeleton,
  Skeleton,
  TextSkeleton,
  rowWidth,
} from "@/components/ui/skeleton/skeleton";

interface BillRowsSkeletonProps {
  rows: number;
  suggestion?: boolean;
}

function BillRowsSkeleton({ rows, suggestion = false }: Readonly<BillRowsSkeletonProps>) {
  return (
    <Rows aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="min-w-0">
              <TextSkeleton width={rowWidth(index)} />
              <TextSkeleton size="xs" width="w-3/4" />
              {suggestion ? <TextSkeleton size="xs" width="w-1/2" /> : null}
            </div>
            <TextSkeleton size="sm" className="justify-end" width="w-16" />
            <div className="col-span-2 flex items-center justify-end sm:col-span-1">
              <Skeleton className="mr-2 h-8 w-28 rounded-lg sm:w-38 pointer-coarse:h-11" />
              <IconButtonSkeleton size="md" />
              {suggestion ? null : <IconButtonSkeleton size="md" />}
            </div>
          </div>
        </li>
      ))}
    </Rows>
  );
}

export function RecurringBillsPending() {
  return (
    <PagePending actions={1}>
      <SectionSkeleton>
        <ChartSkeleton />
      </SectionSkeleton>
      <Section aria-hidden="true" className="space-y-4">
        {[2, 3].map((rows) => (
          <div key={rows}>
            <TextSkeleton size="sm" width="w-28" />
            <BillRowsSkeleton rows={rows} />
          </div>
        ))}
      </Section>
      <ListSectionSkeleton description>
        <BillRowsSkeleton rows={2} suggestion />
      </ListSectionSkeleton>
    </PagePending>
  );
}
