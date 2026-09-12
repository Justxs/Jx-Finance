import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGetMonthlyTrendEndpointSuspense } from "@/api/generated";
import { useMoney } from "@/hooks/use-formatters";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function MonthlyTrendChart() {
  const { t } = useTranslation();
  const money = useMoney();
  const trend = useGetMonthlyTrendEndpointSuspense({ months: 6 });

  const items = trend.data?.items ?? [];
  const chartData = items.map((item) => ({
    label: `${MONTH_LABELS[(item.month ?? 1) - 1]} ${item.year}`,
    income: Number(item.income ?? 0),
    expense: Number(item.expense ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          formatter={(value) => money.format(Number(value ?? 0))}
          contentStyle={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--card-foreground)",
          }}
        />
        <Legend
          formatter={(value) =>
            value === "income" ? t("dashboard.monthIncome") : t("dashboard.monthExpense")
          }
        />
        <Bar dataKey="income" name="income" fill="var(--secondary)" radius={4} />
        <Bar dataKey="expense" name="expense" fill="var(--destructive)" radius={4} />
      </BarChart>
    </ResponsiveContainer>
  );
}
