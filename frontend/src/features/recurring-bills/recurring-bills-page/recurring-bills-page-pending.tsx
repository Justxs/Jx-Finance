import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { ListSectionSkeleton } from "@/components/list-section/list-section";
import { PagePending } from "@/components/route-pending/route-pending";
import { Section } from "@/components/ui/section/section";
import { SectionSkeleton, TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { BillRowsSkeleton } from "@/features/recurring-bills/bill-row-layout";

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
