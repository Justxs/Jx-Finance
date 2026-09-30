import { PanelRowsSkeleton } from "@/components/panel-rows/panel-rows";
import { ProgressRowsSkeleton } from "@/components/progress-row/progress-row";
import { PagePending } from "@/components/route-pending/route-pending";
import { SummaryStatsSkeleton } from "@/components/summary-stats/summary-stats";

export function BudgetsPending() {
  return (
    <PagePending description actions={1}>
      <SummaryStatsSkeleton items={2} />
      <PanelRowsSkeleton>
        <ProgressRowsSkeleton rows={4} />
      </PanelRowsSkeleton>
    </PagePending>
  );
}
