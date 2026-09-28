import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import {
  ButtonSkeleton,
  IconButtonSkeleton,
  Skeleton,
  TextSkeleton,
  rowWidth,
} from "@/components/ui/skeleton/skeleton";
import { SettingsPending } from "@/features/settings/settings-layout/settings-pending";

function HouseholdCardSkeleton() {
  return (
    <Section aria-hidden="true">
      <div className="mb-2 flex items-center justify-between gap-3">
        <TextSkeleton size="title" width="w-40" />
        <div className="flex gap-1">
          <IconButtonSkeleton />
          <IconButtonSkeleton />
        </div>
      </div>
      <Rows>
        {Array.from({ length: 2 }, (_, index) => (
          <li
            key={index}
            className="flex flex-col gap-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <TextSkeleton size="sm" width={rowWidth(index)} />
              <TextSkeleton size="xs" width="w-1/3" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-28 rounded-lg pointer-coarse:h-11" />
              <IconButtonSkeleton />
            </div>
          </li>
        ))}
      </Rows>
      <div className="flex justify-end gap-2 pt-3">
        <ButtonSkeleton size="sm" className="w-28" />
        <ButtonSkeleton size="sm" className="w-28" />
      </div>
    </Section>
  );
}

export function HouseholdsPending() {
  return (
    <SettingsPending current="households">
      <div className="mb-2 flex items-center justify-between gap-3">
        <TextSkeleton size="title" width="w-32" />
        <ButtonSkeleton size="sm" className="w-32" />
      </div>
      <HouseholdCardSkeleton />
    </SettingsPending>
  );
}
