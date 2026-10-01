import { useMonthlyTrendSuspense } from "@/api/generated";
import { IncomeExpenseChart } from "@/components/chart";
import { monthlyTrendParams } from "@/features/dashboard/dashboard-queries";
import { useShortMonth } from "@/hooks/use-formatters";
import { useTodayDate } from "@/hooks/use-settings";
import { useShare, withShare } from "@/stores/my-share-store";

interface Props {
  month: string;
}

export function MonthlyTrendChart({ month }: Readonly<Props>) {
  const trend = useMonthlyTrendSuspense(withShare(monthlyTrendParams(month), useShare()));
  const monthFormat = useShortMonth();
  const today = useTodayDate();

  const items = trend.data.items;
  const chartData = items.map((item) => ({
    label: monthFormat.format(new Date(item.year ?? 0, (item.month ?? 1) - 1, 1)),
    income: Number(item.income ?? 0),
    expense: Number(item.expense ?? 0),
    partial: item.year === today.getFullYear() && item.month === today.getMonth() + 1,
  }));

  return <IncomeExpenseChart data={chartData} height={300} />;
}
