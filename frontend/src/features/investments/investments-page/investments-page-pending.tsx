import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { getAccountsSuspenseQueryOptions } from "@/api/generated";
import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { PagePending } from "@/components/route-pending/route-pending";
import { SummaryStatsSkeleton } from "@/components/summary-stats/summary-stats";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import {
  ButtonSkeleton,
  IconButtonSkeleton,
  SectionSkeleton,
  Skeleton,
  TextSkeleton,
  rowWidth,
} from "@/components/ui/skeleton/skeleton";
import { TableSkeleton } from "@/components/ui/table/table";
import { silentQuery } from "@/lib/query-client";

interface TableSectionProps {
  rows: number;
  columns: number;
  description?: boolean;
}

function TableSectionSkeleton({ rows, columns, description = false }: Readonly<TableSectionProps>) {
  return (
    <Section aria-hidden="true">
      <TextSkeleton size="title" className="mb-2" width="w-40" />
      {description ? <TextSkeleton size="sm" className="mb-2" width="w-3/4 max-w-prose" /> : null}
      <TableSkeleton rows={rows} columns={columns} className="-mx-3" />
    </Section>
  );
}

function SelectHeaderSkeleton() {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
      <TextSkeleton size="title" width="w-40" />
      <ButtonSkeleton className="w-36" />
    </div>
  );
}

function AllocationSkeleton() {
  return (
    <SectionSkeleton>
      <ul className="space-y-3.5">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index}>
            <div className="flex gap-3">
              <TextSkeleton size="sm" className="flex-1" width={rowWidth(index)} />
              <TextSkeleton size="xs" className="w-10 shrink-0 justify-end" width="w-8" />
              <TextSkeleton size="sm" className="w-28 shrink-0 justify-end" width="w-20" />
            </div>
            <Skeleton className="mt-1.5 h-1.5 w-full rounded-none" />
          </li>
        ))}
      </ul>
    </SectionSkeleton>
  );
}

export function ActivitySkeleton() {
  return (
    <Section aria-hidden="true">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <TextSkeleton size="title" width="w-40" />
        <ButtonSkeleton className="w-full sm:w-52" />
      </div>
      <Rows>
        {Array.from({ length: 10 }, (_, index) => (
          <li key={index} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <TextSkeleton size="sm" width={rowWidth(index)} />
              <TextSkeleton size="xs" width="w-1/2" />
            </div>
            <TextSkeleton size="sm" className="shrink-0" width="w-20" />
            <div className="-mr-2 flex shrink-0 gap-3">
              <IconButtonSkeleton />
              <IconButtonSkeleton />
            </div>
          </li>
        ))}
      </Rows>
    </Section>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-5">
      <SummaryStatsSkeleton items={4} />
      <Section aria-hidden="true">
        <SelectHeaderSkeleton />
        <ChartSkeleton legend />
      </Section>
      <AllocationSkeleton />
      <TableSectionSkeleton rows={4} columns={8} />
      <TableSectionSkeleton rows={2} columns={6} />
      <ActivitySkeleton />
    </div>
  );
}

function TaxSummarySkeleton() {
  return (
    <div className="space-y-5">
      <Section aria-hidden="true">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <TextSkeleton size="title" width="w-40" />
          <div className="flex flex-wrap items-center gap-2">
            <ButtonSkeleton className="w-28" />
            <ButtonSkeleton className="w-28" />
            <ButtonSkeleton className="w-20" />
            <ButtonSkeleton className="w-20" />
          </div>
        </div>
        <TextSkeleton size="sm" width="w-3/4 max-w-prose" />
        <TextSkeleton size="sm" className="mt-2" width="w-2/3 max-w-prose" />
      </Section>
      <SummaryStatsSkeleton items={4} />
      <TableSectionSkeleton rows={4} columns={7} description />
      <TableSectionSkeleton rows={4} columns={4} />
      <TableSectionSkeleton rows={2} columns={4} />
    </div>
  );
}

export function InvestmentsBodySkeleton({ taxView }: Readonly<{ taxView: boolean }>) {
  return taxView ? <TaxSummarySkeleton /> : <OverviewSkeleton />;
}

export function InvestmentsPending() {
  const taxView = useSearch({ strict: false, select: (search) => search.view === "taxSummary" });
  const accountCount = useQuery({
    ...getAccountsSuspenseQueryOptions(),
    select: (accounts) => accounts.length,
    ...silentQuery,
  }).data;

  return (
    <PagePending description actions={taxView ? 1 : 4}>
      {!taxView && (accountCount === undefined || accountCount > 1) ? (
        <div className="mb-4 w-full sm:w-56">
          <Skeleton className="h-9 w-full rounded-lg pointer-coarse:h-11" />
        </div>
      ) : null}
      <InvestmentsBodySkeleton taxView={taxView} />
    </PagePending>
  );
}
