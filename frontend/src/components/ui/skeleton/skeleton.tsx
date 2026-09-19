import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

const rowWidths = ["w-3/5", "w-2/5", "w-1/2", "w-2/3", "w-1/3", "w-3/5"] as const;

interface RowsSkeletonProps {
  rows?: number;
  className?: string;
}

function RowsSkeleton({ rows = 5, className }: Readonly<RowsSkeletonProps>) {
  return (
    <ul data-slot="rows-skeleton" aria-hidden="true" className={cn("rows", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-4 py-2.5">
          <Skeleton className="h-4 w-14 shrink-0 rounded-sm" />
          <div className="min-w-0 flex-1">
            <Skeleton className={cn("h-4 rounded-sm", rowWidths[index % rowWidths.length])} />
          </div>
          <Skeleton className="h-4 w-20 shrink-0 rounded-sm" />
        </li>
      ))}
    </ul>
  );
}

function StatsSkeleton({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      data-slot="stats-skeleton"
      aria-hidden="true"
      className={cn("split-columns gap-y-6 lg:items-end", className)}
    >
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-4 w-24 rounded-sm" />
        <Skeleton className="h-11 w-52 max-w-full rounded-sm" />
      </div>
      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-x-8 gap-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded-sm" />
          <Skeleton className="h-6 w-24 rounded-sm" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded-sm" />
          <Skeleton className="h-6 w-24 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

export { Skeleton, RowsSkeleton, StatsSkeleton };
