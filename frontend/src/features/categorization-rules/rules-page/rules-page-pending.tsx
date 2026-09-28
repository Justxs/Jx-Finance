import { ListSectionSkeleton } from "@/components/list-section/list-section";
import { PagePending } from "@/components/route-pending/route-pending";
import { Rows } from "@/components/ui/rows/rows";
import {
  IconButtonSkeleton,
  Skeleton,
  TextSkeleton,
  rowWidth,
} from "@/components/ui/skeleton/skeleton";

const RULE_ROWS = 5;

export function RulesPending() {
  return (
    <PagePending description actions={2}>
      <ListSectionSkeleton description>
        <Rows>
          {Array.from({ length: RULE_ROWS }, (_, index) => (
            <li key={index} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <TextSkeleton size="sm" className="mt-0.5 w-6 shrink-0 justify-end" width="w-3" />
                <div className="min-w-0 flex-1">
                  <TextSkeleton size="sm" width={rowWidth(index)} />
                  <TextSkeleton size="xs" width="w-2/3" />
                  <div className="mt-1 flex items-center gap-1">
                    <TextSkeleton size="xs" width="w-12" />
                    <Skeleton className="h-5.5 w-20 rounded-sm" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <IconButtonSkeleton />
                <IconButtonSkeleton />
                <IconButtonSkeleton />
                <IconButtonSkeleton />
              </div>
            </li>
          ))}
        </Rows>
      </ListSectionSkeleton>
    </PagePending>
  );
}
