import { useTranslation } from "react-i18next";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { useAxisMoney } from "@/hooks/use-formatters";
import { ChartLegend } from "./chart-legend";
import { axisProps, chartCursor } from "./chart-theme";
import { type ChartSeries, ChartTooltip } from "./chart-tooltip";

interface IncomeExpensePoint {
  label: string;
  income: number;
  expense: number;
}

interface Props {
  data: readonly IncomeExpensePoint[];
  height?: number;
}

export function IncomeExpenseChart({ data, height = 280 }: Readonly<Props>) {
  const { t } = useTranslation();
  const axisMoney = useAxisMoney();

  const series: ChartSeries[] = [
    {
      key: "income",
      label: t("charts.income"),
      color: "var(--chart-2)",
      sign: "+",
      tone: "text-income",
    },
    { key: "expense", label: t("charts.expense"), color: "var(--chart-3)", sign: "−" },
    {
      key: "net",
      label: t("charts.net"),
      color: "var(--foreground)",
      sign: "auto",
      shape: "line",
    },
  ];

  const chartData = data.map((point) => ({ ...point, net: point.income - point.expense }));
  const showDots = chartData.length <= 16;

  if (chartData.every((point) => point.income === 0 && point.expense === 0)) {
    return <EmptyText>{t("charts.empty")}</EmptyText>;
  }

  return (
    <div className="space-y-3">
      <ChartLegend series={series} />
      <div role="img" aria-label={t("charts.trendLabel")}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            accessibilityLayer={false}
            data={chartData}
            margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
            barCategoryGap="28%"
            barGap={2}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              {...axisProps}
              tickMargin={8}
              minTickGap={16}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(value) => axisMoney.format(Number(value))}
              {...axisProps}
              tickCount={5}
              width={56}
            />
            <ReferenceLine y={0} stroke="var(--rule)" />
            <Tooltip
              cursor={chartCursor}
              content={<ChartTooltip series={series} summaryKey="net" />}
              isAnimationActive={false}
              offset={12}
            />
            <Bar
              isAnimationActive={false}
              maxBarSize={14}
              dataKey="income"
              fill="var(--chart-2)"
              radius={[1, 1, 0, 0]}
            />
            <Bar
              isAnimationActive={false}
              maxBarSize={14}
              dataKey="expense"
              fill="var(--chart-3)"
              radius={[1, 1, 0, 0]}
            />
            <Line
              isAnimationActive={false}
              type="linear"
              dataKey="net"
              stroke="var(--foreground)"
              strokeWidth={1.5}
              dot={
                showDots
                  ? {
                      r: 2.5,
                      fill: "var(--background)",
                      stroke: "var(--foreground)",
                      strokeWidth: 1.5,
                    }
                  : false
              }
              activeDot={{
                r: 4,
                fill: "var(--foreground)",
                stroke: "var(--background)",
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
