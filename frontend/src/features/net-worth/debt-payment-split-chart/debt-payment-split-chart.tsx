import { barY } from "@tanstack/charts";
import { useTranslation } from "react-i18next";
import type { DebtSchedulePlan } from "@/api/generated/model";
import {
  CHART_COLOR_NEGATIVE,
  CHART_COLOR_POSITIVE,
  CHART_COLOR_PRIMARY,
  type ChartSeries,
} from "@/components/chart";
import { BarChartFrame } from "@/components/chart/bar-chart-frame";
import { toCents } from "@/lib/money";

interface YearSplit {
  label: string;
  interest: number;
  principal: number;
  extra: number;
}

interface PartSeries extends ChartSeries {
  key: "interest" | "principal" | "extra";
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
  const data = splitByYear(plan);
  const withExtra = data.some((year) => year.extra > 0);

  const series: PartSeries[] = [
    { key: "interest", label: t("netWorth.schedule.interest"), color: CHART_COLOR_NEGATIVE },
    { key: "principal", label: t("netWorth.schedule.principal"), color: CHART_COLOR_PRIMARY },
    ...(withExtra
      ? ([
          { key: "extra", label: t("netWorth.schedule.extra"), color: CHART_COLOR_POSITIVE },
        ] satisfies PartSeries[])
      : []),
  ];

  const segments = data.flatMap((year) =>
    series.map((item) => ({ ...year, part: item.key, amount: year[item.key], color: item.color })),
  );

  return (
    <BarChartFrame
      data={data}
      series={series}
      ariaLabel={t("netWorth.schedule.splitChartLabel")}
      height={240}
      bandPadding={0.2}
      marks={[
        barY(segments, {
          x: "label",
          y: "amount",
          z: "part",
          fill: (segment) => segment.color,
          maxThickness: 24,
          radius: { end: 1 },
        }),
      ]}
    />
  );
}
