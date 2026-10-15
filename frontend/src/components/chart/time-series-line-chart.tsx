import { d3Curve, dot, lineY, ruleY, whenFocused } from "@tanstack/charts";
import { scalePoint } from "@tanstack/charts/scales/point";
import { curveMonotoneX, curveStepAfter } from "d3-shape";
import { useId } from "react";
import { useAxisDateTick, useAxisMoney, useIsoDate } from "@/hooks/use-formatters";
import { parseIso } from "@/lib/calendar";
import { CartesianChart } from "./cartesian-chart";
import { ChartDataTable } from "./chart-data-table";
import { ChartLegend } from "./chart-legend";
import { CHART_HEIGHT } from "./chart-skeleton";
import { type ChartSeries, ChartTooltip, tooltipPayload } from "./chart-tooltip";

const SHORT_SPAN_MS = 92 * 24 * 60 * 60 * 1000;

const X_AXES = {
  date: { dataKey: "date", minTickGap: 48 },
  day: { dataKey: "day", minTickGap: 24 },
} as const;

const CURVES = {
  monotone: d3Curve(curveMonotoneX),
  stepAfter: d3Curve(curveStepAfter),
};

const ACTIVE_DOT = { r: 4, stroke: "var(--background)", strokeWidth: 2 } as const;

function strokePattern(item: TimeSeriesLine) {
  if (item.shape === "dotted") {
    return "1.5 3";
  }
  return item.comparison || item.shape === "dashed" ? "4 3" : undefined;
}

function numberAt(key: string) {
  return (row: TimeSeriesPoint) => {
    const value = row[key];
    return typeof value === "number" ? value : undefined;
  };
}

function valueDomain(data: readonly TimeSeriesPoint[], keys: readonly string[], auto: boolean) {
  const values = data.flatMap((row) =>
    keys.map((key) => row[key]).filter((value) => typeof value === "number"),
  );
  const min = Math.min(...values, ...(auto ? [] : [0]));
  const max = Math.max(...values, ...(auto ? [] : [0]));
  return max > min ? ([min, max] as const) : ([min, min + 1] as const);
}

type TimeSeriesPoint = Readonly<Record<string, string | number | undefined>>;

export interface TimeSeriesLine extends ChartSeries {
  comparison?: boolean;
  markers?: boolean;
}

interface Props {
  data: readonly TimeSeriesPoint[];
  series: readonly TimeSeriesLine[];
  ariaLabel: string;
  legend?: boolean;
  zeroLine?: boolean;
  yDomain?: ["auto", "auto"];
  xAxis?: keyof typeof X_AXES;
  curve?: keyof typeof CURVES;
  formatLabel?: (label: string) => string;
  currency?: string;
}

export function TimeSeriesLineChart({
  data,
  series,
  ariaLabel,
  legend = false,
  zeroLine = false,
  yDomain,
  xAxis = "date",
  curve = "monotone",
  formatLabel,
  currency,
}: Readonly<Props>) {
  const axisMoney = useAxisMoney();
  const formatDate = useIsoDate();
  const axis = X_AXES[xAxis];
  const tableId = useId();

  const first = parseIso(String(data[0]?.date ?? ""));
  const last = parseIso(String(data.at(-1)?.date ?? ""));
  const shortSpan = first && last ? last.getTime() - first.getTime() < SHORT_SPAN_MS : false;
  const formatTick = useAxisDateTick(shortSpan);

  const lines = series.toSorted(
    (a, b) => Number(Boolean(b.comparison)) - Number(Boolean(a.comparison)),
  );
  const swatchSeries = series.map((item) =>
    item.comparison && item.shape !== "dotted" ? { ...item, shape: "dashed" as const } : item,
  );

  function atX(row: TimeSeriesPoint) {
    return row[axis.dataKey];
  }

  const marks = [
    ...(zeroLine ? [ruleY([0], { stroke: "var(--rule)", strokeOpacity: 1 })] : []),
    ...lines.map((item) =>
      item.markers
        ? dot(data, {
            id: item.key,
            x: atX,
            y: numberAt(item.key),
            fill: item.color,
            ...ACTIVE_DOT,
          })
        : lineY(data, {
            id: item.key,
            x: atX,
            y: numberAt(item.key),
            stroke: item.color,
            strokeWidth: item === series[0] ? 2 : 1.5,
            strokeDasharray: strokePattern(item),
            lineCap: "butt",
            lineJoin: "miter",
            curve: CURVES[curve],
          }),
    ),
    ...lines
      .filter((item) => !item.comparison && !item.markers)
      .map((item) =>
        whenFocused(dot(data, { x: atX, y: numberAt(item.key), fill: item.color, ...ACTIVE_DOT }), {
          match: "x",
        }),
      ),
  ];

  const chart = (
    <>
      <div role="img" aria-label={ariaLabel} aria-describedby={tableId}>
        <CartesianChart
          marks={marks}
          x={{
            scale: () => scalePoint<string | number>(),
            format: xAxis === "date" ? formatTick : undefined,
            minTickGap: axis.minTickGap,
          }}
          yDomain={valueDomain(
            data,
            series.map((item) => item.key),
            yDomain !== undefined,
          )}
          formatY={(value) => axisMoney.format(value, currency)}
          height={CHART_HEIGHT}
          ariaLabel={ariaLabel}
          renderTooltip={(row, label) => (
            <ChartTooltip
              active
              label={label}
              payload={tooltipPayload(row, swatchSeries)}
              series={swatchSeries}
              formatLabel={formatLabel ?? formatDate}
              currency={currency}
            />
          )}
        />
      </div>
      <ChartDataTable
        id={tableId}
        caption={ariaLabel}
        data={data}
        labelKey={axis.dataKey}
        series={swatchSeries}
        formatLabel={formatLabel ?? (xAxis === "date" ? formatDate : undefined)}
        currency={currency}
      />
    </>
  );

  if (!legend) {
    return chart;
  }

  return (
    <div className="space-y-3">
      <ChartLegend series={swatchSeries} />
      {chart}
    </div>
  );
}
