import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DebtSchedulePlan } from "@/api/generated/model";
import {
  CHART_COLOR_NEGATIVE,
  CHART_COLOR_POSITIVE,
  CHART_COLOR_PRIMARY,
  type ChartSeries,
  ChartLegend,
  ChartTooltip,
  axisProps,
  chartCursor,
} from "@/components/chart";
import { useAxisMoney } from "@/hooks/use-formatters";
import { toCents } from "@/lib/money";

interface YearSplit {
  label: string;
  interest: number;
  principal: number;
  extra: number;
}

interface Props {
  plan: DebtSchedulePlan;
}

export function splitByYear(plan: DebtSchedulePlan): YearSplit[] {
  const years = new Map<string, { interest: number; principal: number; extra: number }>();
  for (const row of plan.rows) {
    const year = row.date.slice(0, 4);
    const sums = years.get(year) ?? { interest: 0, principal: 0, extra: 0 };
    sums.interest += toCents(row.interest);
    sums.principal += toCents(row.principal);
    sums.extra += toCents(row.extra);
    years.set(year, sums);
  }

  return [...years].map(([label, sums]) => ({
    label,
    interest: sums.interest / 100,
    principal: sums.principal / 100,
    extra: sums.extra / 100,
  }));
}

export function DebtPaymentSplitChart({ plan }: Readonly<Props>) {
  const { t } = useTranslation();
  const axisMoney = useAxisMoney();
  const data = splitByYear(plan);
  const withExtra = data.some((year) => year.extra > 0);

  const series: ChartSeries[] = [
    { key: "interest", label: t("netWorth.schedule.interest"), color: CHART_COLOR_NEGATIVE },
    { key: "principal", label: t("netWorth.schedule.principal"), color: CHART_COLOR_PRIMARY },
    ...(withExtra
      ? ([
          { key: "extra", label: t("netWorth.schedule.extra"), color: CHART_COLOR_POSITIVE },
        ] satisfies ChartSeries[])
      : []),
  ];

  return (
    <div className="space-y-3">
      <ChartLegend series={series} />
      <div role="img" aria-label={t("netWorth.schedule.splitChartLabel")}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            accessibilityLayer={false}
            data={data}
            margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
            barCategoryGap="20%"
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
            <Tooltip
              cursor={chartCursor}
              content={<ChartTooltip series={series} />}
              isAnimationActive={false}
              offset={12}
            />
            {series.map((item) => (
              <Bar
                key={item.key}
                isAnimationActive={false}
                stackId="payment"
                maxBarSize={24}
                dataKey={item.key}
                fill={item.color}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
