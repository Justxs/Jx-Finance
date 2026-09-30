import { PanelRowsSkeleton } from "@/components/panel-rows/panel-rows";
import { ProgressRowsSkeleton } from "@/components/progress-row/progress-row";
import { PagePending } from "@/components/route-pending/route-pending";

export function GoalsPending() {
  return (
    <PagePending actions={1}>
      <PanelRowsSkeleton>
        <ProgressRowsSkeleton rows={4} />
      </PanelRowsSkeleton>
    </PagePending>
  );
}
