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

export function MonthlyTrendChart() {
  const { t, i18n } = useTranslation();
  const money = useMoney();
  const trend = useGetMonthlyTrendEndpointSuspense({ months: 6 });
  const monthFormat = new Intl.DateTimeFormat(i18n.language, { month: "short", year: "numeric" });

  const items = trend.data?.items ?? [];
  const chartData = items.map((item) => ({
    label: monthFormat.format(new Date(item.year ?? 0, (item.month ?? 1) - 1, 1)),
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
