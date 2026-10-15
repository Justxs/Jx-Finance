import { type ChartMark, crosshair, defineChart } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react/tooltip";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import type { ReactNode } from "react";
import { axisTicks, chartCursor, chartTheme } from "./chart-theme";

interface Props {
  marks: readonly ChartMark<object>[];
  x: { scale: () => unknown; format?: (value: string) => string; minTickGap: number };
  yDomain?: readonly [number, number];
  formatY: (value: number) => string;
  height: number;
  ariaLabel: string;
  renderTooltip: (row: unknown, label: string) => ReactNode;
}

export function CartesianChart({
  marks,
  x,
  yDomain,
  formatY,
  height,
  ariaLabel,
  renderTooltip,
}: Readonly<Props>) {
  const definition = defineChart({
    marks: [crosshair({ x: chartCursor, y: false }), ...marks],
    scales: {
      x: {
        scale: x.scale,
        axis: {
          ...axisTicks,
          ticks: {
            size: 0,
            format: (value) => (x.format ? x.format(String(value)) : String(value)),
          },
          tickLabels: {
            ...axisTicks.tickLabels,
            thin: { minGap: x.minTickGap, priority: "ends" },
          },
        },
      },
      y: {
        scale: yDomain ? scaleLinear().domain(yDomain) : scaleLinear,
        nice: 5,
        grid: { strokeOpacity: 1 },
        axis: { ...axisTicks, ticks: { count: 5, size: 0, format: formatY } },
      },
    },
    theme: chartTheme,
    focus: "group-x",
    focusRing: false,
    keyboard: false,
    maxFocusDistance: Number.POSITIVE_INFINITY,
    tooltip: {
      use: tooltip,
      anchor: "pointer",
      placement: ["right", "left", "bottom", "top"],
      offset: 12,
      sticky: false,
    },
  });

  return (
    <div aria-hidden="true">
      <Chart
        definition={definition}
        height={height}
        ariaLabel={ariaLabel}
        className="tabular-nums"
        renderTooltipBody={({ points }) =>
          points[0] ? renderTooltip(points[0].datum, String(points[0].xValue)) : null
        }
      />
    </div>
  );
}
