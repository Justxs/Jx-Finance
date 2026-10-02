import type { ComponentProps, ReactNode } from "react";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Skeleton, TextSkeleton, rowWidth } from "@/components/ui/skeleton/skeleton";
import { cn } from "@/lib/utils";

interface TableProps extends ComponentProps<"table"> {
  label?: string;
  columns?: readonly (`w-${string}` | undefined)[];
}

function Table({ label, columns, className, children, ...props }: Readonly<TableProps>) {
  const table = (
    <table
      data-slot="table"
      className={cn("w-full caption-bottom text-sm", columns && "table-fixed", className)}
      {...props}
    >
      {columns ? (
        <colgroup>
          {Object.entries(columns).map(([position, width]) => (
            <col key={position} className={width} />
          ))}
        </colgroup>
      ) : null}
      {children}
    </table>
  );

  if (label) {
    return (
      <ScrollRegion aria-label={label} className="relative -mx-3">
        {table}
      </ScrollRegion>
    );
  }

  return (
    <div data-slot="table-container" className="relative w-full">
      {table}
    </div>
  );
}

function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:hover:bg-transparent", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-b-0", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

interface TableHeadProps extends ComponentProps<"th"> {
  numeric?: boolean;
  wrap?: boolean;
}

function TableHead({ className, numeric = false, wrap = false, ...props }: TableHeadProps) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-9 px-3 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground has-[[role=checkbox]]:pr-0",
        numeric && "text-right",
        wrap && "h-auto py-2 align-bottom whitespace-normal",
        className,
      )}
      {...props}
    />
  );
}

interface TableCellProps extends ComponentProps<"td"> {
  numeric?: boolean;
}

function TableCell({ className, numeric = false, ...props }: TableCellProps) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-2.5 align-middle whitespace-nowrap has-[[role=checkbox]]:pr-0",
        numeric && "text-right tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

interface TableEmptyRowProps {
  colSpan: number;
  filtered?: boolean;
  action?: ReactNode;
  onClearFilters?: () => void;
  children: ReactNode;
}

function TableEmptyRow({
  colSpan,
  filtered = false,
  action,
  onClearFilters,
  children,
}: Readonly<TableEmptyRowProps>) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-0 whitespace-normal">
        <EmptyText filtered={filtered} action={action} onClearFilters={onClearFilters}>
          {children}
        </EmptyText>
      </TableCell>
    </TableRow>
  );
}

interface ScrollRegionProps extends Omit<ComponentProps<"div">, "aria-label"> {
  "aria-label": string;
}

function ScrollRegion({ className, ...props }: Readonly<ScrollRegionProps>) {
  return (
    <div
      data-slot="scroll-region"
      role="region"
      tabIndex={0}
      className={cn("overflow-x-auto", className)}
      {...props}
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  lines?: 1 | 2;
  className?: string;
}

function TableSkeleton({
  rows = 5,
  columns = 4,
  lines = 1,
  className,
}: Readonly<TableSkeletonProps>) {
  const cells = Array.from({ length: columns }, (_, index) => index);

  return (
    <div data-slot="table-skeleton" aria-hidden="true" className={cn("-mx-3 text-sm", className)}>
      <div className="flex h-9 items-center gap-6 border-b px-3">
        {cells.map((cell) => (
          <TextSkeleton key={cell} size="xs" className="flex-1" width="w-16" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-6 border-b px-3 py-2.5 last:border-b-0">
          {lines === 2 ? (
            <div className="flex-1">
              <TextSkeleton size="sm" width={rowWidth(row)} />
              <TextSkeleton size="sm" width="w-1/3" />
            </div>
          ) : null}
          {cells.slice(lines === 2 ? 1 : 0).map((cell) => (
            <div key={cell} className="flex h-8 flex-1 items-center">
              <Skeleton
                className={cn(
                  "h-[0.7em] rounded-sm",
                  cell === 0 ? rowWidth(row) : "w-3/5",
                  cell === columns - 1 && "ml-auto",
                )}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableEmptyRow,
  ScrollRegion,
  TableSkeleton,
};
