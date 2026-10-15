import type { ChartMark } from "@tanstack/charts";
import { scaleBand } from "@tanstack/charts/scales/band";
import { useId } from "react";
import { useAxisMoney } from "@/hooks/use-formatters";
import { CartesianChart } from "./cartesian-chart";
import { ChartDataTable } from "./chart-data-table";
import { ChartLegend } from "./chart-legend";
import { type ChartSeries, ChartTooltip, tooltipPayload } from "./chart-tooltip";

interface Props {
  data: readonly object[];
  series: readonly ChartSeries[];
  ariaLabel: string;
  height: number;
  bandPadding: number;
  summaryKey?: string;
  formatLabel?: (label: string) => string;
  marks: readonly ChartMark<object>[];
}

export function BarChartFrame({
  data,
  series,
  ariaLabel,
  height,
  bandPadding,
  summaryKey,
  formatLabel,
  marks,
}: Readonly<Props>) {
  const axisMoney = useAxisMoney();
  const tableId = useId();

  return (
    <div className="space-y-3">
      <ChartLegend series={series} />
      <div role="img" aria-label={ariaLabel} aria-describedby={tableId}>
        <CartesianChart
          marks={marks}
          x={{ scale: () => scaleBand().padding(bandPadding), minTickGap: 16 }}
          formatY={(value) => axisMoney.format(value)}
          height={height}
          ariaLabel={ariaLabel}
          renderTooltip={(row, label) => (
            <ChartTooltip
              active
              label={label}
              payload={tooltipPayload(row, series)}
              series={series}
              summaryKey={summaryKey}
              formatLabel={formatLabel}
            />
          )}
        />
      </div>
      <ChartDataTable
        id={tableId}
        caption={ariaLabel}
        data={data}
        labelKey="label"
        series={series}
        formatLabel={formatLabel}
      />
    </div>
  );
}
