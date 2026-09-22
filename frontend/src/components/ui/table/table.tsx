import * as React from "react";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { cn } from "@/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:hover:bg-transparent", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-b-0", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
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

interface TableHeadProps extends React.ComponentProps<"th"> {
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

interface TableCellProps extends React.ComponentProps<"td"> {
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
  children: React.ReactNode;
}

function TableEmptyRow({ colSpan, filtered = false, children }: Readonly<TableEmptyRowProps>) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-0 whitespace-normal">
        <EmptyText filtered={filtered}>{children}</EmptyText>
      </TableCell>
    </TableRow>
  );
}

interface ScrollRegionProps extends Omit<React.ComponentProps<"div">, "aria-label"> {
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

export {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableEmptyRow,
  ScrollRegion,
};
