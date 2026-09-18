import { useGetCategoryBreakdownEndpointSuspense } from "@/api/generated";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { monthBounds } from "@/lib/calendar";

export function CategoryBreakdownChart() {
  const breakdown = useGetCategoryBreakdownEndpointSuspense();
  const { dateFrom, dateTo } = monthBounds();

  return (
    <CategoryBreakdown items={breakdown.data?.items ?? []} dateFrom={dateFrom} dateTo={dateTo} />
  );
}
