import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { RecordRowsSkeleton } from "@/components/record-row/record-row";
import { PagePending } from "@/components/route-pending/route-pending";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import {
  IconButtonSkeleton,
  SectionSkeleton,
  TextSkeleton,
  rowWidth,
} from "@/components/ui/skeleton/skeleton";
import { TableSkeleton } from "@/components/ui/table/table";
import { useSettings } from "@/hooks/use-settings";

const ACCOUNT_ROWS = 5;

export function MovementsSkeleton() {
  return (
    <SectionSkeleton>
      <RecordRowsSkeleton rows={3} />
    </SectionSkeleton>
  );
}

function AccountRowsSkeleton() {
  return (
    <Rows aria-hidden="true" className="md:hidden">
      {Array.from({ length: ACCOUNT_ROWS }, (_, index) => (
        <li key={index} className="py-2.5">
          <div className="flex gap-3">
            <TextSkeleton size="sm" className="flex-1" width={rowWidth(index)} />
            <TextSkeleton size="sm" width="w-20" />
          </div>
          <div className="flex items-center gap-3">
            <TextSkeleton size="xs" className="flex-1" width="w-1/3" />
            <IconButtonSkeleton />
          </div>
        </li>
      ))}
    </Rows>
  );
}

export function AccountsPending() {
  const { features } = useSettings();

  return (
    <PagePending actions={1}>
      <Section as="div" aria-hidden="true">
        <AccountRowsSkeleton />
        <TableSkeleton rows={ACCOUNT_ROWS} columns={6} lines={2} className="hidden md:block" />
      </Section>
      {features.recurringBills ? (
        <SectionSkeleton>
          <ChartSkeleton />
        </SectionSkeleton>
      ) : null}
      <MovementsSkeleton />
      {features.multiCurrency ? <MovementsSkeleton /> : null}
    </PagePending>
  );
}
