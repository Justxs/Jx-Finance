import { useSearch } from "@tanstack/react-router";
import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { ListSectionSkeleton } from "@/components/list-section/list-section";
import { PagePending } from "@/components/route-pending/route-pending";
import { SummaryStatsSkeleton } from "@/components/summary-stats/summary-stats";
import { Section } from "@/components/ui/section/section";
import {
  ButtonSkeleton,
  IconButtonSkeleton,
  SectionSkeleton,
  TextSkeleton,
} from "@/components/ui/skeleton/skeleton";
import { BillRowsSkeleton } from "@/features/recurring-bills/bill-row-layout";
import { BillsCalendarSkeleton } from "@/features/recurring-bills/bills-calendar/bills-calendar";

function CalendarSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <TextSkeleton size="title" width="w-40" />
        <div className="flex items-center gap-1">
          <ButtonSkeleton size="sm" className="w-16" />
          <IconButtonSkeleton size="md" />
          <IconButtonSkeleton size="md" />
        </div>
      </div>
      <BillsCalendarSkeleton />
    </div>
  );
}

function ListSkeleton() {
  return (
    <>
      <SummaryStatsSkeleton items={3} />
      <SectionSkeleton>
        <ChartSkeleton />
      </SectionSkeleton>
      <Section aria-hidden="true">
        <TextSkeleton size="title" width="w-40" />
        <div className="mt-4 space-y-4">
          {[2, 3].map((rows) => (
            <div key={rows}>
              <TextSkeleton size="sm" width="w-28" />
              <BillRowsSkeleton rows={rows} />
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

export function RecurringBillsPending() {
  const calendar = useSearch({ strict: false, select: (search) => search.view === "calendar" });

  return (
    <PagePending actions={2}>
      {calendar ? <CalendarSkeleton /> : <ListSkeleton />}
      <ListSectionSkeleton description>
        <BillRowsSkeleton rows={2} suggestion />
      </ListSectionSkeleton>
    </PagePending>
  );
}
