import { useCategoryBreakdownSuspense } from "@/api/generated";
import { CategoryBreakdown } from "@/components/category-breakdown/category-breakdown";
import { useTodayDate } from "@/hooks/use-settings";
import { monthBounds } from "@/lib/calendar";

export function CategoryBreakdownChart() {
  const breakdown = useCategoryBreakdownSuspense();
  const { dateFrom, dateTo } = monthBounds(useTodayDate());

  return (
    <CategoryBreakdown items={breakdown.data?.items ?? []} dateFrom={dateFrom} dateTo={dateTo} />
  );
}
