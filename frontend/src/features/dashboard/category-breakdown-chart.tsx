import { useGetCategoryBreakdownEndpoint } from "@/api/generated";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { Skeleton } from "@/components/ui/skeleton";

export function CategoryBreakdownChart() {
  const breakdown = useGetCategoryBreakdownEndpoint();
  return breakdown.isPending ? (
    <Skeleton className="h-64 w-full" />
  ) : (
    <CategoryBreakdown items={breakdown.data?.items ?? []} />
  );
}
