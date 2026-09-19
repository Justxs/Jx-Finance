import { useGetCategoryBreakdownEndpointSuspense } from "@/api/generated";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { useTodayDate } from "@/hooks/use-settings";
import { monthBounds } from "@/lib/calendar";

export function CategoryBreakdownChart() {
  const breakdown = useGetCategoryBreakdownEndpointSuspense();
  const { dateFrom, dateTo } = monthBounds(useTodayDate());

  return (
    <CategoryBreakdown items={breakdown.data?.items ?? []} dateFrom={dateFrom} dateTo={dateTo} />
  );
}
