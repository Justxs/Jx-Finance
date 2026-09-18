import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TableHead } from "@/components/ui/table";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

interface Props {
  label: string;
  sortKey?: string;
  activeSort?: string;
  direction?: SortDirection;
  onSort?: (key: string) => void;
  filter?: ReactNode;
}

export function ColumnHeader({
  label,
  sortKey,
  activeSort,
  direction,
  onSort,
  filter,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const sorted = Boolean(sortKey) && activeSort === sortKey;
  const next: SortDirection = sorted && direction === "asc" ? "desc" : "asc";

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

interface SortableTableHeadProps extends Props {
  className?: string;
}

export function SortableTableHead({ className, ...header }: Readonly<SortableTableHeadProps>) {
  const sorted = Boolean(header.sortKey) && header.activeSort === header.sortKey;

  let ariaSort: "ascending" | "descending" | undefined;
  if (sorted) {
    ariaSort = header.direction === "desc" ? "descending" : "ascending";
  }

  return (
    <TableHead className={className} aria-sort={ariaSort}>
      <ColumnHeader {...header} />
    </TableHead>
  );
}
