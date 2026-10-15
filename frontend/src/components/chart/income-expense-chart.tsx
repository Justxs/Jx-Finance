import { barY, dot, group, lineY, ruleY, whenFocused } from "@tanstack/charts";
import { useTranslation } from "react-i18next";
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
  partial?: boolean;
}

interface BarRow extends IncomeExpensePoint {
  side: "income" | "expense";
  amount: number;
}

const BAR_WIDTH = 14;
const BAR_GAP = 2;
const PARTIAL_OPACITY = 40;
const SIDES = ["income", "expense"] as const;
const BAR_COLORS = { income: CHART_COLOR_POSITIVE, expense: CHART_COLOR_NEGATIVE } as const;

function pairedBands() {
  let span = 0;

  function width() {
    return Math.max(0, Math.min(BAR_WIDTH, (span - BAR_GAP) / 2));
  }

  function scale(side: string) {
    return side === "income" ? span / 2 - BAR_GAP / 2 - width() : span / 2 + BAR_GAP / 2;
  }

  scale.domain = () => SIDES;
  scale.range = (values: Iterable<number>) => {
    const [start = 0, end = 0] = values;
    span = end - start;
    return scale;
  };
  scale.bandwidth = width;
  scale.copy = pairedBands;
  return scale;
}

function barFill(row: BarRow) {
  const color = BAR_COLORS[row.side];
  return row.partial ? `color-mix(in oklab, ${color} ${PARTIAL_OPACITY}%, transparent)` : color;
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
  const bars = chartData.flatMap((point): BarRow[] => [
    { ...point, side: "income", amount: point.income },
    { ...point, side: "expense", amount: point.expense },
  ]);
  const partialLabels = new Set(data.filter((point) => point.partial).map((point) => point.label));

  function formatLabel(label: string) {
    return partialLabels.has(label) ? t("charts.soFar", { label }) : label;
  }

  function comparisonLine(key: "comparisonIncome" | "comparisonExpense", color: string) {
    return [
      lineY(chartData, {
        id: key,
        x: "label",
        y: key,
        stroke: color,
        strokeWidth: 1.5,
        strokeDasharray: "4 3",
        lineCap: "butt",
      }),
      whenFocused(dot(chartData, { x: "label", y: key, r: 3, fill: color }), { match: "x" }),
    ];
  }

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
      bandPadding={0.28}
      summaryKey="net"
      formatLabel={partialLabels.size > 0 ? formatLabel : undefined}
      marks={[
        ruleY([0], { stroke: "var(--rule)", strokeOpacity: 1 }),
        barY(bars, {
          x: "label",
          y: "amount",
          z: "side",
          layout: group({ scale: pairedBands() }),
          fill: barFill,
          stroke: (row) => (row.partial ? BAR_COLORS[row.side] : "none"),
          radius: [1, 1, 0, 0],
        }),
        ...(compared
          ? [
              ...comparisonLine("comparisonIncome", CHART_COLOR_POSITIVE),
              ...comparisonLine("comparisonExpense", CHART_COLOR_NEGATIVE),
            ]
          : []),
        lineY(chartData, {
          id: "net",
          x: "label",
          y: "net",
          stroke: "var(--foreground)",
          strokeWidth: 1.5,
          lineCap: "butt",
          lineJoin: "miter",
        }),
        ...(chartData.length <= 16
          ? [
              dot(chartData, {
                x: "label",
                y: "net",
                r: 2.5,
                fill: "var(--background)",
                stroke: "var(--foreground)",
                strokeWidth: 1.5,
              }),
            ]
          : []),
        whenFocused(
          dot(chartData, {
            x: "label",
            y: "net",
            r: 4,
            fill: "var(--foreground)",
            stroke: "var(--background)",
            strokeWidth: 2,
          }),
          { match: "x" },
        ),
      ]}
    />
  );
}
