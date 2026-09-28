import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import {
  ButtonSkeleton,
  IconButtonSkeleton,
  Skeleton,
  TextSkeleton,
  rowWidth,
} from "@/components/ui/skeleton/skeleton";

const CHECKLIST_ROWS = 3;

export function MonthCloseReviewSkeleton() {
  return (
    <Section aria-hidden="true">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
          <Skeleton className="mt-1 size-5 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <TextSkeleton size="title" width="w-56" />
            <TextSkeleton size="sm" className="mt-0.5" width="w-40" />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ButtonSkeleton className="w-44" />
          <IconButtonSkeleton size="md" />
        </div>
      </div>
      <Rows className="mt-4">
        {Array.from({ length: CHECKLIST_ROWS }, (_, index) => (
          <li key={index} className="flex items-center gap-2.5 py-2.5">
            <Skeleton className="size-4 shrink-0 rounded-full" />
            <TextSkeleton size="sm" className="flex-1" width={rowWidth(index)} />
          </li>
        ))}
      </Rows>
    </Section>
  );
}
