import { type MoneySign, useMoney } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  sign?: MoneySign;
  tone?: string;
  shape?: "bar" | "line" | "dashed";
}

interface TooltipEntry {
  dataKey?: string | number | ((entry: unknown) => unknown);
  value?: unknown;
}

interface Props {
  active?: boolean;
  label?: unknown;
  payload?: readonly TooltipEntry[];
  series: readonly ChartSeries[];
  formatLabel?: (label: string) => string;
  summaryKey?: string;
}

export function ChartSwatch({ series }: Readonly<{ series: ChartSeries }>) {
  const flat = series.shape === "line" || series.shape === "dashed";

  return (
    <span
      aria-hidden="true"
      className={cn("inline-block shrink-0", flat ? "h-0.5 w-3" : "size-2")}
      style={
        series.shape === "dashed"
          ? {
              backgroundImage: `repeating-linear-gradient(to right, ${series.color} 0 3px, transparent 3px 6px)`,
            }
          : { backgroundColor: series.color }
      }
    />
  );
}

export function ChartTooltip({
  active,
  label,
  payload,
  series,
  formatLabel,
  summaryKey,
}: Readonly<Props>) {
  const money = useMoney();

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const values = new Map(
    payload
      .filter((entry) => entry.value !== undefined && entry.value !== null)
      .map((entry) => [String(entry.dataKey), Number(entry.value)]),
  );
  const rows = series.filter((item) => values.has(item.key));
  const text = typeof label === "string" || typeof label === "number" ? String(label) : "";

  function formatValue(item: ChartSeries) {
    const amount = values.get(item.key) ?? 0;
    return item.sign ? money.formatSigned(amount, item.sign) : money.format(amount);
  }

  return (
    <div className="min-w-44 rounded-md border bg-popover px-3 py-2.5 text-popover-foreground shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">
        {formatLabel ? formatLabel(text) : text}
      </p>
      <dl className="mt-1.5 space-y-1 text-sm">
        {rows.map((item) => (
          <div
            key={item.key}
            className={cn(
              "flex items-center gap-2",
              item.key === summaryKey && "mt-1.5 border-t border-rule pt-1.5",
            )}
          >
            <ChartSwatch series={item} />
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd className={cn("ml-auto pl-4 font-semibold tabular-nums", item.tone)}>
              {formatValue(item)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
