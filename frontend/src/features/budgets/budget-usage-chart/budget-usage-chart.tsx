import { useTranslation } from "react-i18next";
import { Bar, Rectangle } from "recharts";
import type { BarShapeProps } from "recharts";
import type { BudgetResponse } from "@/api/generated/model";
import { CHART_COLOR_NEGATIVE, CHART_COLOR_PRIMARY, type ChartSeries } from "@/components/chart";
import { BarChartFrame } from "@/components/chart/bar-chart-frame";

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

  const series: ChartSeries[] = [
    { key: "limit", label: t("budgets.limitSeries"), color: "var(--input)" },
    { key: "spent", label: t("budgets.spent"), color: CHART_COLOR_PRIMARY },
  ];

  const chartData = budgets
    .map((budget) => ({
      label: budget.categoryName,
      limit: Number(budget.effectiveLimit),
      spent: Number(budget.spent),
    }))
    .toSorted((a, b) => b.limit - a.limit);

  function spentShape(props: BarShapeProps) {
    const row = chartData[props.index];
    const over = row !== undefined && row.spent > row.limit;
    return <Rectangle {...props} fill={over ? CHART_COLOR_NEGATIVE : CHART_COLOR_PRIMARY} />;
  }

  return (
    <BarChartFrame
      data={chartData}
      series={series}
      ariaLabel={t("budgets.usageLabel")}
      height={chartData.length * ROW_HEIGHT + 32}
      layout="vertical"
      barCategoryGap="30%"
      barGap={2}
      formatCategory={shorten}
    >
      <Bar isAnimationActive={false} dataKey="limit" fill="var(--input)" maxBarSize={10} />
      <Bar isAnimationActive={false} dataKey="spent" maxBarSize={10} shape={spentShape} />
    </BarChartFrame>
  );
}
