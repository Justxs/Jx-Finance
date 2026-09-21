import type { TagResponse } from "@/api/generated/model";
import { Tag } from "@/components/ui/tag/tag";
import { cn } from "@/lib/utils";

interface Props {
  tagIds: readonly string[];
  tagById: ReadonlyMap<string, TagResponse>;
  className?: string;
  limit?: number;
}

const LIMIT = 3;

export function TagChips({ tagIds, tagById, className, limit = LIMIT }: Readonly<Props>) {
  const names = tagIds
    .map((id) => tagById.get(id)?.name)
    .filter((name) => name !== undefined)
    .toSorted((a, b) => a.localeCompare(b, "lt"));

  if (names.length === 0) {
    return null;
  }

  const shown = names.slice(0, limit);
  const hidden = names.length - shown.length;

  return (
    <span
      className={cn("inline-flex flex-wrap items-center gap-1", className)}
      title={names.join(", ")}
    >
      {shown.map((name) => (
        <Tag key={name}>{name}</Tag>
      ))}
      {hidden > 0 ? <Tag>{`+${hidden}`}</Tag> : null}
    </span>
  );
}

export function tagMapOf(tags: readonly TagResponse[]): ReadonlyMap<string, TagResponse> {
  return new Map(tags.map((tag) => [tag.id, tag]));
}
