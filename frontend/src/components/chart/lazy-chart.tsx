import { type ComponentType, lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton/skeleton";

export function lazyChart<TProps extends object>(
  load: () => Promise<ComponentType<TProps>>,
  fallbackHeight: number,
) {
  const Chart = lazy(async () => ({ default: await load() }));

  function LazyChart(props: TProps) {
    return (
      <Suspense
        fallback={
          <Skeleton
            className="h-(--chart-height) w-full rounded-sm"
            style={{ "--chart-height": `${fallbackHeight}px` }}
          />
        }
      >
        <Chart {...props} />
      </Suspense>
    );
  }

  return LazyChart;
}
