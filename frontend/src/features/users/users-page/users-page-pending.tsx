import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import {
  ButtonSkeleton,
  IconButtonSkeleton,
  Skeleton,
  TextSkeleton,
  rowWidth,
} from "@/components/ui/skeleton/skeleton";
import { TableSkeleton } from "@/components/ui/table/table";
import { SettingsPending } from "@/features/settings/settings-layout/settings-pending";

const USER_ROWS = 4;

export function UsersPending() {
  return (
    <SettingsPending current="users">
      <Section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <TextSkeleton size="title" width="w-24" />
          <ButtonSkeleton size="sm" className="w-28" />
        </div>
        <Rows className="md:hidden">
          {Array.from({ length: USER_ROWS }, (_, index) => (
            <li key={index} className="space-y-2 py-2.5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <TextSkeleton size="sm" width={rowWidth(index)} />
                  <TextSkeleton size="xs" width="w-1/2" />
                </div>
                <Skeleton className="h-5.5 w-14 rounded-sm" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 flex-1 rounded-lg pointer-coarse:h-11" />
                <IconButtonSkeleton />
                <IconButtonSkeleton />
              </div>
            </li>
          ))}
        </Rows>
        <TableSkeleton rows={USER_ROWS} columns={4} lines={2} className="-mx-3 hidden md:block" />
      </Section>
    </SettingsPending>
  );
}
