import { type ChartSeries, ChartSwatch } from "./chart-tooltip";

interface Props {
  series: readonly ChartSeries[];
}

export function ChartLegend({ series }: Readonly<Props>) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {series.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          <ChartSwatch series={item} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
