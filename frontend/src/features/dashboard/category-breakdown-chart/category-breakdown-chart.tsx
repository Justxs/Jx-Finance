import { useCategoryBreakdownSuspense } from "@/api/generated";
import { CategoryBreakdown } from "@/components/category-breakdown/category-breakdown";
import { monthDate } from "@/features/month-close/month-key";
import { monthBounds } from "@/lib/calendar";

interface Props {
  month: string;
}

export function CategoryBreakdownChart({ month }: Readonly<Props>) {
  const breakdown = useCategoryBreakdownSuspense({ month });
  const { dateFrom, dateTo } = monthBounds(monthDate(month));

  return <CategoryBreakdown items={breakdown.data.items} dateFrom={dateFrom} dateTo={dateTo} />;
}
