import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BudgetResponse } from "@/api/generated/model";
import { axisTick, ChartLegend, type ChartSeries, ChartTooltip } from "@/components/chart";
import { useAxisMoney } from "@/hooks/use-formatters";

const ROW_HEIGHT = 44;
const MAX_LABEL = 18;

interface Props {
  budgets: readonly BudgetResponse[];
}

function shorten(value: string) {
  return value.length > MAX_LABEL ? `${value.slice(0, MAX_LABEL - 1)}…` : value;
}

export function BudgetUsageChart({ budgets }: Readonly<Props>) {
  const { t } = useTranslation();
  const axisMoney = useAxisMoney();

  const series: ChartSeries[] = [
    { key: "limit", label: t("budgets.limitSeries"), color: "var(--input)" },
    { key: "spent", label: t("budgets.spent"), color: "var(--chart-1)" },
  ];

  const chartData = budgets
    .map((budget) => ({
      name: budget.categoryName,
      limit: Number(budget.limitAmount),
      spent: Number(budget.spent),
    }))
    .toSorted((a, b) => b.limit - a.limit);

  return (
    <div className="space-y-3">
      <ChartLegend series={series} />
      <div role="img" aria-label={t("budgets.usageLabel")}>
        <ResponsiveContainer width="100%" height={chartData.length * ROW_HEIGHT + 32}>
          <BarChart
            accessibilityLayer={false}
            layout="vertical"
            data={chartData}
            margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
            barCategoryGap="30%"
            barGap={2}
          >
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis
              type="number"
              tickFormatter={(value) => axisMoney.format(Number(value))}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              tickCount={5}
            />
            <YAxis
              type="category"
              dataKey="name"
              tickFormatter={(value) => shorten(String(value))}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              width={132}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
              content={<ChartTooltip series={series} />}
              isAnimationActive={false}
              offset={12}
            />
            <Bar isAnimationActive={false} dataKey="limit" fill="var(--input)" maxBarSize={10} />
            <Bar isAnimationActive={false} dataKey="spent" maxBarSize={10}>
              {chartData.map((row) => (
                <Cell
                  key={row.name}
                  fill={row.spent > row.limit ? "var(--chart-3)" : "var(--chart-1)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
