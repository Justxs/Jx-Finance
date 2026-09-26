import { useTranslation } from "react-i18next";
import { Bar, Line, ReferenceLine } from "recharts";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { INCOME_TONE } from "@/lib/tone";
import { BarChartFrame } from "./bar-chart-frame";
import { CHART_COLOR_NEGATIVE, CHART_COLOR_POSITIVE } from "./chart-theme";
import type { ChartSeries } from "./chart-tooltip";

interface IncomeExpensePoint {
  label: string;
  income: number;
  expense: number;
  comparisonIncome?: number;
  comparisonExpense?: number;
}

interface Props {
  data: readonly IncomeExpensePoint[];
  height?: number;
}

export function IncomeExpenseChart({ data, height = 280 }: Readonly<Props>) {
  const { t } = useTranslation();

  const compared = data.some((point) => point.comparisonIncome !== undefined);

  const series: ChartSeries[] = [
    {
      key: "income",
      label: t("charts.income"),
      color: CHART_COLOR_POSITIVE,
      sign: "+",
      tone: INCOME_TONE,
    },
    { key: "expense", label: t("charts.expense"), color: CHART_COLOR_NEGATIVE, sign: "−" },
    ...(compared
      ? ([
          {
            key: "comparisonIncome",
            label: t("charts.earlierIncome"),
            color: CHART_COLOR_POSITIVE,
            sign: "+",
            shape: "dashed",
          },
          {
            key: "comparisonExpense",
            label: t("charts.earlierExpense"),
            color: CHART_COLOR_NEGATIVE,
            sign: "−",
            shape: "dashed",
          },
        ] satisfies ChartSeries[])
      : []),
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

  if (
    chartData.every(
      (point) =>
        point.income === 0 &&
        point.expense === 0 &&
        !point.comparisonIncome &&
        !point.comparisonExpense,
    )
  ) {
    return <EmptyText>{t("charts.empty")}</EmptyText>;
  }

  return (
    <BarChartFrame
      data={chartData}
      series={series}
      ariaLabel={t("charts.trendLabel")}
      height={height}
      barCategoryGap="28%"
      barGap={2}
      summaryKey="net"
    >
      <ReferenceLine y={0} stroke="var(--rule)" />
      <Bar
        isAnimationActive={false}
        maxBarSize={14}
        dataKey="income"
        fill={CHART_COLOR_POSITIVE}
        radius={[1, 1, 0, 0]}
      />
      <Bar
        isAnimationActive={false}
        maxBarSize={14}
        dataKey="expense"
        fill={CHART_COLOR_NEGATIVE}
        radius={[1, 1, 0, 0]}
      />
      {compared ? (
        <Line
          isAnimationActive={false}
          type="linear"
          dataKey="comparisonIncome"
          stroke={CHART_COLOR_POSITIVE}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
          activeDot={{ r: 3, fill: CHART_COLOR_POSITIVE }}
        />
      ) : null}
      {compared ? (
        <Line
          isAnimationActive={false}
          type="linear"
          dataKey="comparisonExpense"
          stroke={CHART_COLOR_NEGATIVE}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
          activeDot={{ r: 3, fill: CHART_COLOR_NEGATIVE }}
        />
      ) : null}
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
    </BarChartFrame>
  );
}
