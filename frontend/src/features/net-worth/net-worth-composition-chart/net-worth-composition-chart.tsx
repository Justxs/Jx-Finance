import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNetWorthHistorySuspense } from "@/api/generated";
import {
  axisTick,
  chartCursor,
  ChartLegend,
  type ChartSeries,
  ChartTooltip,
} from "@/components/chart";
import { useAxisMoney, useIsoDate } from "@/hooks/use-formatters";
import { parseIso } from "@/lib/calendar";

const SHORT_SPAN_MS = 92 * 24 * 60 * 60 * 1000;

export function NetWorthCompositionChart() {
  const { t, i18n } = useTranslation();
  const axisMoney = useAxisMoney();
  const formatDate = useIsoDate();
  const history = useNetWorthHistorySuspense();

  const items = history.data?.items ?? [];
  if (items.length < 2) {
    return <p className="py-6 text-sm text-muted-foreground">{t("netWorth.notEnoughHistory")}</p>;
  }

  const series: ChartSeries[] = [
    { key: "accounts", label: t("netWorth.accounts"), color: "var(--chart-1)", shape: "line" },
    { key: "assets", label: t("netWorth.assets"), color: "var(--chart-2)", shape: "line" },
    { key: "debts", label: t("netWorth.debts"), color: "var(--chart-3)", shape: "line" },
  ];

  const chartData = items.map((item) => ({
    date: item.date,
    accounts: Number(item.accounts ?? 0),
    assets: Number(item.assets ?? 0),
    debts: Number(item.debts ?? 0),
  }));

  const first = parseIso(items[0]?.date ?? "");
  const last = parseIso(items.at(-1)?.date ?? "");
  const shortSpan = first && last ? last.getTime() - first.getTime() < SHORT_SPAN_MS : false;
  const tickFormat = new Intl.DateTimeFormat(
    i18n.language,
    shortSpan ? { day: "numeric", month: "short" } : { month: "short", year: "2-digit" },
  );

  function formatTick(value: string) {
    const parsed = parseIso(value);
    return parsed ? tickFormat.format(parsed) : value;
  }

  return (
    <div className="space-y-3">
      <ChartLegend series={series} />
      <div role="img" aria-label={t("netWorth.compositionLabel")}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            accessibilityLayer={false}
            data={chartData}
            margin={{ top: 8, right: 24, bottom: 0, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => formatTick(String(value))}
              minTickGap={48}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              tickFormatter={(value) => axisMoney.format(Number(value))}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              tickCount={5}
              width={60}
            />
            <Tooltip
              cursor={chartCursor}
              content={<ChartTooltip series={series} formatLabel={formatDate} />}
              isAnimationActive={false}
              offset={12}
            />
            {series.map((item) => (
              <Line
                key={item.key}
                isAnimationActive={false}
                type="monotone"
                dataKey={item.key}
                stroke={item.color}
                strokeWidth={item.key === "accounts" ? 2 : 1.5}
                dot={false}
                activeDot={{ r: 4, fill: item.color, stroke: "var(--background)", strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
