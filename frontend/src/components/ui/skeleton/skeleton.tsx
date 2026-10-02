import type { ComponentProps, ReactNode } from "react";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-border", className)}
      {...props}
    />
  );
}

const textSizes = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  label: "text-sm leading-5",
  title: "text-lg leading-6",
  xl: "text-xl",
  page: "font-serif text-page-title",
  stat: "font-serif text-stat",
  "stat-lg": "font-serif text-stat-lg",
} as const;

interface TextSkeletonProps {
  size?: keyof typeof textSizes;
  width?: string;
  className?: string;
}

function TextSkeleton({ size = "base", width = "w-24", className }: Readonly<TextSkeletonProps>) {
  return (
    <div
      data-slot="text-skeleton"
      aria-hidden="true"
      className={cn("flex h-lh items-center", textSizes[size], className)}
    >
      <Skeleton className={cn("h-[0.7em] max-w-full rounded-sm", width)} />
    </div>
  );
}

interface ButtonSkeletonProps {
  size?: "sm" | "md";
  className?: string;
}

function ButtonSkeleton({ size = "md", className }: Readonly<ButtonSkeletonProps>) {
  return (
    <Skeleton
      className={cn(
        "w-24 rounded-lg pointer-coarse:h-11",
        size === "sm" ? "h-8" : "h-9",
        className,
      )}
    />
  );
}

function IconButtonSkeleton({ size = "sm" }: Readonly<{ size?: "sm" | "md" }>) {
  return (
    <Skeleton
      className={cn(
        "shrink-0 rounded-lg pointer-coarse:size-11",
        size === "sm" ? "size-8" : "size-9",
      )}
    />
  );
}

const rowWidths = ["w-3/5", "w-2/5", "w-1/2", "w-2/3", "w-1/3", "w-3/5"] as const;

function rowWidth(index: number) {
  return rowWidths[index % rowWidths.length];
}

interface RowsSkeletonProps {
  rows?: number;
  lines?: 1 | 2;
  className?: string;
}

function RowsSkeleton({ rows = 5, lines = 1, className }: Readonly<RowsSkeletonProps>) {
  return (
    <Rows data-slot="rows-skeleton" aria-hidden="true" className={className}>
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-start gap-4 py-2.5">
          <TextSkeleton size="sm" className="w-14 shrink-0" width="w-10" />
          <div className="min-w-0 flex-1">
            <TextSkeleton size="sm" width={rowWidth(index)} />
            {lines === 2 ? <TextSkeleton size="xs" width="w-1/3" /> : null}
          </div>
          <TextSkeleton size="sm" className="shrink-0" width="w-20" />
        </li>
      ))}
    </Rows>
  );
}

interface SectionSkeletonProps {
  rows?: number;
  description?: boolean;
  className?: string;
  children?: ReactNode;
}

function SectionSkeleton({
  rows = 4,
  description = false,
  className,
  children,
}: Readonly<SectionSkeletonProps>) {
  return (
    <Section data-slot="section-skeleton" aria-hidden="true" className={className}>
      <TextSkeleton size="title" width="w-40" />
      {description ? <TextSkeleton size="sm" className="mt-1" width="w-3/4 max-w-prose" /> : null}
      <div className="mt-4">{children ?? <RowsSkeleton rows={rows} />}</div>
    </Section>
  );
}

export {
  Skeleton,
  TextSkeleton,
  ButtonSkeleton,
  IconButtonSkeleton,
  RowsSkeleton,
  SectionSkeleton,
  rowWidth,
};
