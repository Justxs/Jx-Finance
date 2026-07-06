import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useGetCategoryBreakdownEndpoint } from "@/api/generated";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoney } from "@/hooks/use-formatters";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
const MAX_SLICES = 5;

export function CategoryBreakdownChart() {
  const { t } = useTranslation();
  const money = useMoney();
  const breakdown = useGetCategoryBreakdownEndpoint();

  const items = breakdown.data?.items ?? [];
  const sorted = [...items].sort((a, b) => Number(b.amount) - Number(a.amount));

  const top = sorted.slice(0, MAX_SLICES);
  const rest = sorted.slice(MAX_SLICES);
  const restTotal = rest.reduce((sum, item) => sum + Number(item.amount), 0);

  const chartData = [
    ...top.map((item, index) => ({
      name: item.categoryName ?? t("transactions.uncategorized"),
      amount: Number(item.amount),
      fill: CHART_COLORS[index % CHART_COLORS.length],
    })),
    ...(restTotal > 0
      ? [{ name: t("dashboard.other"), amount: restTotal, fill: CHART_COLORS[MAX_SLICES % CHART_COLORS.length] }]
      : []),
  ];

  if (breakdown.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (chartData.length === 0) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">{t("dashboard.noSpending")}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 44)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 48, bottom: 8, left: 8 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Bar dataKey="amount" radius={4} barSize={20}>
          <LabelList
            dataKey="amount"
            position="right"
            formatter={(value: string | number | boolean | null | undefined) =>
              money.format(Number(value ?? 0))
            }
            fill="var(--foreground)"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
