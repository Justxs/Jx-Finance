import { ProgressRowsSkeleton } from "@/components/progress-row/progress-row";
import { PagePending } from "@/components/route-pending/route-pending";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";

export function GoalsPending() {
  return (
    <PagePending actions={1}>
      <Section as={Rows} className="py-2 sm:py-3" aria-hidden="true">
        <ProgressRowsSkeleton rows={4} />
      </Section>
    </PagePending>
  );
}
