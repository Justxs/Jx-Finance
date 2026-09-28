import { Skeleton, TextSkeleton } from "@/components/ui/skeleton/skeleton";

export const CHART_HEIGHT = 240;

export interface ChartSkeletonProps {
  height?: number;
  legend?: boolean;
}

export function ChartSkeleton({
  height = CHART_HEIGHT,
  legend = false,
}: Readonly<ChartSkeletonProps>) {
  return (
    <div data-slot="chart-skeleton" aria-hidden="true" className="space-y-3">
      {legend ? (
        <div className="flex gap-x-4">
          <TextSkeleton size="xs" width="w-16" />
          <TextSkeleton size="xs" width="w-16" />
          <TextSkeleton size="xs" width="w-16" />
        </div>
      ) : null}
      <Skeleton
        className="h-(--chart-height) w-full rounded-sm"
        style={{ "--chart-height": `${height}px` }}
      />
    </div>
  );
}
