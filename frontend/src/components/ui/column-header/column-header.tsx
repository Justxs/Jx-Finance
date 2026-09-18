import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
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
  const sorted = !!sortKey && activeSort === sortKey;
  const next: SortDirection = sorted && direction === "asc" ? "desc" : "asc";

  let Icon = ChevronsUpDown;
  if (sorted) {
    Icon = direction === "desc" ? ArrowDown : ArrowUp;
  }

  return (
    <span className="inline-flex items-center gap-1">
      {sortKey && onSort ? (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          aria-label={t(next === "asc" ? "filters.sortAsc" : "filters.sortDesc", { column: label })}
          title={t(next === "asc" ? "filters.sortAsc" : "filters.sortDesc", { column: label })}
          className={cn(
            "inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground",
            sorted && "text-foreground",
          )}
        >
          {label}
          <Icon className={cn("size-3", sorted ? "opacity-100" : "opacity-40")} />
        </button>
      ) : (
        label
      )}
      {filter}
    </span>
  );
}
