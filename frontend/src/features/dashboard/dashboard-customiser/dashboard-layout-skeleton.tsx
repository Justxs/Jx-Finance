import { DashboardCard } from "@/api/generated/model";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import {
  ButtonSkeleton,
  IconButtonSkeleton,
  Skeleton,
  TextSkeleton,
  rowWidth,
} from "@/components/ui/skeleton/skeleton";

const CARD_COUNT = Object.keys(DashboardCard).length;

export function DashboardLayoutSkeleton() {
  return (
    <Section aria-hidden="true" className="max-w-2xl">
      <TextSkeleton size="title" width="w-52" />
      <div className="mt-1">
        <TextSkeleton size="sm" width="w-full" />
        <TextSkeleton size="sm" width="w-1/2" />
      </div>
      <Rows className="mt-4">
        {Array.from({ length: CARD_COUNT }, (_, index) => (
          <li key={index} className="flex items-center gap-2 py-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-3 py-1.5">
              <Skeleton className="size-4 shrink-0 rounded-md" />
              <TextSkeleton size="sm" className="flex-1" width={rowWidth(index)} />
            </div>
            <IconButtonSkeleton />
            <IconButtonSkeleton />
          </li>
        ))}
      </Rows>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <ButtonSkeleton className="w-40" />
        <ButtonSkeleton className="w-20" />
      </div>
    </Section>
  );
}
