import { useGetCategoryBreakdownEndpointSuspense } from "@/api/generated";
import { CategoryBreakdown } from "@/components/category-breakdown";

export function CategoryBreakdownChart() {
  const breakdown = useGetCategoryBreakdownEndpointSuspense();

  return <CategoryBreakdown items={breakdown.data?.items ?? []} />;
}
