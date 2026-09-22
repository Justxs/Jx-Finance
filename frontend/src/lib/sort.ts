import type { SortDirection } from "@/api/generated/model";

export type { SortDirection };

export type AriaSort = "ascending" | "descending" | undefined;

export function nextSortDirection<K extends string>(
  sortKey: K | undefined,
  activeSort: K | undefined,
  direction: SortDirection | undefined,
): SortDirection {
  return sortKey !== undefined && activeSort === sortKey && direction === "asc" ? "desc" : "asc";
}

export function ariaSortFor<K extends string>(
  sortKey: K | undefined,
  activeSort: K | undefined,
  direction: SortDirection | undefined,
): AriaSort {
  if (sortKey === undefined || activeSort !== sortKey) {
    return undefined;
  }

  return direction === "desc" ? "descending" : "ascending";
}
