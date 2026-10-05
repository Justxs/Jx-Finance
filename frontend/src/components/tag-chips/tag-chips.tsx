import type { TagResponse } from "@/api/generated/model";
import { HintTag, Tag } from "@/components/ui/tag/tag";
import { cn } from "@/lib/utils";

interface Props {
  tagIds: readonly string[];
  tagById: ReadonlyMap<string, TagResponse>;
  className?: string;
}

const LIMIT = 3;

export function TagChips({ tagIds, tagById, className }: Readonly<Props>) {
  const names = tagIds
    .map((id) => tagById.get(id)?.name)
    .filter((name) => name !== undefined)
    .toSorted((a, b) => a.localeCompare(b, "lt"));

  if (names.length === 0) {
    return null;
  }

  const shown = names.slice(0, LIMIT);
  const hidden = names.slice(LIMIT);

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {shown.map((name) => (
        <Tag key={name}>{name}</Tag>
      ))}
      {hidden.length > 0 ? <HintTag hint={hidden.join(", ")}>{`+${hidden.length}`}</HintTag> : null}
    </span>
  );
}
