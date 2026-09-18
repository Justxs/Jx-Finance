import { useTranslation } from "react-i18next";
import { useGetMonthlyTrendEndpointSuspense } from "@/api/generated";
import { IncomeExpenseChart } from "@/components/chart";

export function MonthlyTrendChart() {
  const { i18n } = useTranslation();
  const trend = useGetMonthlyTrendEndpointSuspense({ months: 6 });
  const monthFormat = new Intl.DateTimeFormat(i18n.language, { month: "short", year: "numeric" });

  const items = trend.data?.items ?? [];
  const chartData = items.map((item) => ({
    label: monthFormat.format(new Date(item.year ?? 0, (item.month ?? 1) - 1, 1)),
    income: Number(item.income ?? 0),
    expense: Number(item.expense ?? 0),
  }));

  return <IncomeExpenseChart data={chartData} />;
}
