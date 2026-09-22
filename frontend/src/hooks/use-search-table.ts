import { nextSortDirection, type SortDirection } from "@/lib/sort";

interface SortSearch {
  sort?: string;
  direction?: SortDirection;
}

interface SortPatch<TSort> {
  sort: TSort;
  direction: SortDirection;
}

export function useSearchTable<TSearch extends SortSearch>(
  search: TSearch,
  patchSearch: (patch: Partial<TSearch> | SortPatch<NonNullable<TSearch["sort"]>>) => void,
) {
  type SortKey = NonNullable<TSearch["sort"]>;

  function setFilter(patch: Partial<TSearch>) {
    patchSearch(patch);
  }

  function setSort(sort: SortKey, direction: SortDirection) {
    patchSearch({ sort, direction });
  }

  function toggleSort(sort: SortKey) {
    setSort(sort, nextSortDirection(sort, search.sort, search.direction));
  }

  function sortProps(sortKey: SortKey) {
    return {
      sortKey,
      activeSort: search.sort as SortKey | undefined,
      direction: search.direction,
      onSort: toggleSort,
    };
  }

  return { search, setFilter, setSort, toggleSort, sortProps };
}
