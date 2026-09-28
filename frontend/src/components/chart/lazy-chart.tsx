import { type ComponentType, lazy, Suspense } from "react";
import { ChartSkeleton, type ChartSkeletonProps } from "./chart-skeleton";

type SkeletonShape<TProps> = ChartSkeletonProps | ((props: TProps) => ChartSkeletonProps);

export function lazyChart<TProps extends object>(
  load: () => Promise<ComponentType<TProps>>,
  skeleton: SkeletonShape<TProps>,
) {
  const Chart = lazy(async () => ({ default: await load() }));

  function LazyChart(props: TProps) {
    const shape = typeof skeleton === "function" ? skeleton(props) : skeleton;
    return (
      <Suspense fallback={<ChartSkeleton {...shape} />}>
        <Chart {...props} />
      </Suspense>
    );
  }

  return LazyChart;
}
