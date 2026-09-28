import { ProgressRowsSkeleton } from "@/components/progress-row/progress-row";
import { PagePending } from "@/components/route-pending/route-pending";
import { SummaryStatsSkeleton } from "@/components/summary-stats/summary-stats";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";

export function BudgetsPending() {
  return (
    <PagePending description actions={1}>
      <SummaryStatsSkeleton items={2} />
      <Section as={Rows} className="py-2 sm:py-3" aria-hidden="true">
        <ProgressRowsSkeleton rows={4} />
      </Section>
    </PagePending>
  );
}
