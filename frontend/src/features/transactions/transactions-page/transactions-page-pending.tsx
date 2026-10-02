import { PaginationSkeleton } from "@/components/pagination/pagination";
import { PagePending } from "@/components/route-pending/route-pending";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import {
  ButtonSkeleton,
  IconButtonSkeleton,
  TextSkeleton,
  rowWidth,
} from "@/components/ui/skeleton/skeleton";
import { TableSkeleton } from "@/components/ui/table/table";
import { useSettings } from "@/hooks/use-settings";
import { usePreferences } from "@/stores/preferences";

export function TransactionsTotalsSkeleton() {
  return (
    <div className="flex min-h-9 flex-1 items-center">
      <TextSkeleton size="sm" width="w-72" />
    </div>
  );
}

function TransactionRowsSkeleton({ rows }: Readonly<{ rows: number }>) {
  return (
    <Rows aria-hidden="true" className="md:hidden">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="py-2">
          <div className="flex gap-3">
            <TextSkeleton size="sm" className="flex-1" width={rowWidth(index)} />
            <TextSkeleton size="sm" width="w-16" />
          </div>
          <div className="flex items-center gap-2">
            <TextSkeleton size="xs" className="flex-1" width="w-1/2" />
            <IconButtonSkeleton />
          </div>
        </li>
      ))}
    </Rows>
  );
}

export function TransactionsPending() {
  const { features, defaultPageSize } = useSettings();
  const rows = usePreferences().pageSize ?? defaultPageSize;

  return (
    <PagePending
      className="space-y-5"
      actions={
        <>
          <div className="flex flex-wrap items-center gap-1">
            <ButtonSkeleton size="sm" className="w-27" />
            <ButtonSkeleton size="sm" />
            <ButtonSkeleton size="sm" />
          </div>
          {features.import ? <ButtonSkeleton className="w-50" /> : null}
          <ButtonSkeleton className="w-38" />
        </>
      }
    >
      <Section className="space-y-2" aria-hidden="true">
        <div className="flex items-center justify-between gap-4">
          <TransactionsTotalsSkeleton />
          <ButtonSkeleton size="sm" className="md:hidden" />
        </div>
        <TableSkeleton rows={rows} columns={6} lines={2} className="hidden md:block" />
        <TransactionRowsSkeleton rows={rows} />
        <PaginationSkeleton />
      </Section>
    </PagePending>
  );
}
