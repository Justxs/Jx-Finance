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
import type { ReportTrendPoint } from "@/api/generated/model";
import { useMoney } from "@/hooks/use-formatters";

interface Props {
  items: ReportTrendPoint[];
  bucket: string;
}

export function ReportTrendChart({ items, bucket }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();

  const chartData = items.map((item) => {
    const date = new Date(item.bucketStart ?? "");
    const label =
      bucket === "month"
        ? date.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
        : date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });

    return {
      label,
      income: Number(item.income ?? 0),
      expense: Number(item.expense ?? 0),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
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
