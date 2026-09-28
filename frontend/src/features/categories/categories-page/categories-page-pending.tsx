import { ListSectionSkeleton } from "@/components/list-section/list-section";
import { NamedRowsSkeleton } from "@/components/named-row/named-row";
import { PagePending } from "@/components/route-pending/route-pending";

export function CategoriesPending() {
  return (
    <PagePending actions={1}>
      <div className="grid gap-5 lg:grid-cols-2">
        <ListSectionSkeleton>
          <NamedRowsSkeleton rows={8} />
        </ListSectionSkeleton>
        <ListSectionSkeleton>
          <NamedRowsSkeleton rows={4} />
        </ListSectionSkeleton>
      </div>
    </PagePending>
  );
}
