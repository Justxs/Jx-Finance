import { type ComponentType, lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function lazyChart<TProps extends object>(
  load: () => Promise<ComponentType<TProps>>,
  fallbackHeight: number,
) {
  const Chart = lazy(async () => ({ default: await load() }));

  function LazyChart(props: TProps) {
    return (
      <Suspense
        fallback={<Skeleton className="w-full rounded-sm" style={{ height: fallbackHeight }} />}
      >
        <Chart {...props} />
      </Suspense>
    );
  }

  return LazyChart;
}
