import { ListSectionSkeleton } from "@/components/list-section/list-section";
import { NamedRowsSkeleton } from "@/components/named-row/named-row";
import { PagePending } from "@/components/route-pending/route-pending";

export function TagsPending() {
  return (
    <PagePending actions={1}>
      <ListSectionSkeleton description>
        <NamedRowsSkeleton rows={5} />
      </ListSectionSkeleton>
      <ListSectionSkeleton description>
        <NamedRowsSkeleton rows={2} />
      </ListSectionSkeleton>
    </PagePending>
  );
}
