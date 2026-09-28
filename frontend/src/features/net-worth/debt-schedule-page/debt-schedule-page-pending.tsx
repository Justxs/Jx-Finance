import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { PaginationSkeleton } from "@/components/pagination/pagination";
import { RecordRowsSkeleton } from "@/components/record-row/record-row";
import { FormGridSkeleton } from "@/components/ui/form-grid/form-grid";
import { Section } from "@/components/ui/section/section";
import { ButtonSkeleton, SectionSkeleton, TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { TableSkeleton } from "@/components/ui/table/table";
import {
  DetailPagePending,
  DetailStatsSkeleton,
  DetailSummarySkeleton,
} from "../detail-page-pending/detail-page-pending";

function DebtPaymentsSkeleton() {
  return (
    <Section aria-hidden="true">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <TextSkeleton size="title" width="w-40" />
        <ButtonSkeleton size="sm" className="w-32" />
      </div>
      <TextSkeleton size="sm" width="w-48" />
      <TextSkeleton size="xs" width="w-3/4 max-w-prose" />
      <div className="mt-2">
        <RecordRowsSkeleton rows={3} />
      </div>
    </Section>
  );
}

export function DebtScheduleSkeleton({ tracked = false }: Readonly<{ tracked?: boolean }>) {
  return (
    <div className="space-y-5">
      <DetailSummarySkeleton>
        <div className="grid min-w-0 gap-6">
          <DetailStatsSkeleton count={4} />
          <div className="border-t pt-4">
            <TextSkeleton size="sm" width="w-36" />
            <TextSkeleton size="xl" className="mt-0.5" />
            <TextSkeleton size="xs" className="mt-1" width="w-48" />
          </div>
        </div>
      </DetailSummarySkeleton>
      <SectionSkeleton description>
        <div className="space-y-4">
          <FormGridSkeleton
            fields={3}
            className="grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]"
          />
          <TextSkeleton size="sm" width="w-64" />
        </div>
      </SectionSkeleton>
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionSkeleton>
          <ChartSkeleton legend={tracked} />
        </SectionSkeleton>
        <SectionSkeleton>
          <ChartSkeleton legend />
        </SectionSkeleton>
      </div>
      <Section aria-hidden="true">
        <TextSkeleton size="title" className="mb-2" width="w-40" />
        <TableSkeleton rows={12} columns={6} className="-mx-3" />
        <PaginationSkeleton goTo />
      </Section>
      {tracked ? <DebtPaymentsSkeleton /> : null}
    </div>
  );
}

export function DebtSchedulePending() {
  return (
    <DetailPagePending>
      <DebtScheduleSkeleton />
    </DetailPagePending>
  );
}
