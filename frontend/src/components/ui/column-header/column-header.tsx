import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TableHead } from "@/components/ui/table/table";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

export type AriaSort = "ascending" | "descending" | undefined;

interface Props<K extends string> {
  label: string;
  sortKey?: K;
  activeSort?: K;
  direction?: SortDirection;
  onSort?: (key: K) => void;
  filter?: ReactNode;
}

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

export function ColumnHeader<K extends string>({
  label,
  sortKey,
  activeSort,
  direction,
  onSort,
  filter,
}: Readonly<Props<K>>) {
  const { t } = useTranslation();
  const sorted = Boolean(sortKey) && activeSort === sortKey;
  const next = nextSortDirection(sortKey, activeSort, direction);

  let Icon = ChevronsUpDown;
  if (sorted) {
    Icon = direction === "desc" ? ArrowDown : ArrowUp;
  }

  return (
    <span className="inline-flex items-center gap-1">
      {sortKey && onSort ? (
        <Tooltip
          content={t(next === "asc" ? "filters.sortAsc" : "filters.sortDesc", { column: label })}
        >
          <button
            type="button"
            onClick={() => onSort(sortKey)}
            aria-label={t(next === "asc" ? "filters.sortAsc" : "filters.sortDesc", {
              column: label,
            })}
            className={cn(
              "inline-flex items-center gap-1 rounded px-1 py-1 transition-colors hover:text-foreground",
              sorted && "text-foreground",
            )}
          >
            {label}
            <Icon className={cn("size-3", sorted ? "opacity-100" : "opacity-40")} />
          </button>
        </Tooltip>
      ) : (
        label
      )}
      {filter}
    </span>
  );
}

interface SortableTableHeadProps<K extends string> extends Props<K> {
  className?: string;
}

export function SortableTableHead<K extends string>({
  className,
  ...header
}: Readonly<SortableTableHeadProps<K>>) {
  return (
    <TableHead
      className={className}
      aria-sort={ariaSortFor(header.sortKey, header.activeSort, header.direction)}
    >
      <ColumnHeader {...header} />
    </TableHead>
  );
}
