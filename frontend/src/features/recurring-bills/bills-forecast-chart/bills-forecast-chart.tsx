import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RecurringBillResponse } from "@/api/generated/model";
import { axisTick, type ChartSeries, ChartTooltip } from "@/components/chart";
import { useAxisMoney } from "@/hooks/use-formatters";
import { useTodayDate } from "@/hooks/use-settings";
import { parseIso } from "@/lib/calendar";

const MONTHS_AHEAD = 6;
const MAX_OCCURRENCES = 64;

interface Props {
  bills: readonly RecurringBillResponse[];
}

function nextOccurrence(date: Date, cadence: RecurringBillResponse["cadence"]) {
  const next = new Date(date);
  if (cadence === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (cadence === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else if (cadence === "quarterly") {
    next.setMonth(next.getMonth() + 3);
  } else {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

function monthIndex(date: Date, start: Date) {
  return (date.getFullYear() - start.getFullYear()) * 12 + date.getMonth() - start.getMonth();
}

export function BillsForecastChart({ bills }: Readonly<Props>) {
  const { t, i18n } = useTranslation();
  const axisMoney = useAxisMoney();
  const today = useTodayDate();
  const monthFormat = new Intl.DateTimeFormat(i18n.language, { month: "short", year: "numeric" });
  const start = new Date(today.getFullYear(), today.getMonth(), 1);

  const totals = Array.from({ length: MONTHS_AHEAD }, () => 0);
  for (const bill of bills) {
    let due = bill.isActive && bill.amount !== null ? parseIso(bill.nextDueDate) : null;
    for (let step = 0; due && step < MAX_OCCURRENCES; step += 1) {
      const index = monthIndex(due, start);
      if (index >= MONTHS_AHEAD) {
        break;
      }
      totals[Math.max(0, index)] = (totals[Math.max(0, index)] ?? 0) + Number(bill.amount);
      due = nextOccurrence(due, bill.cadence);
    }
  }

  const series: ChartSeries[] = [
    { key: "total", label: t("recurringBills.forecastSeries"), color: "var(--chart-1)" },
  ];

  const chartData = totals.map((total, index) => ({
    label: monthFormat.format(new Date(start.getFullYear(), start.getMonth() + index, 1)),
    total: Math.round(total * 100) / 100,
  }));

  if (chartData.every((point) => point.total === 0)) {
    return (
      <p className="py-6 text-sm text-muted-foreground">{t("recurringBills.forecastEmpty")}</p>
    );
  }

  return (
    <div role="img" aria-label={t("recurringBills.forecastLabel")}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          accessibilityLayer={false}
          data={chartData}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
          barCategoryGap="40%"
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            minTickGap={16}
          />
          <YAxis
            tickFormatter={(value) => axisMoney.format(Number(value))}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            tickCount={5}
            width={56}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
            content={<ChartTooltip series={series} />}
            isAnimationActive={false}
            offset={12}
          />
          <Bar
            isAnimationActive={false}
            dataKey="total"
            fill="var(--chart-1)"
            maxBarSize={22}
            radius={[1, 1, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
