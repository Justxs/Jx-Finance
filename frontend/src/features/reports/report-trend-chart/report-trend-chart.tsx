import type { ReportTrendPoint } from "@/api/generated/model";
import { IncomeExpenseChart } from "@/components/chart";
import { useShortDay, useShortMonth } from "@/hooks/use-formatters";
import { parseIso } from "@/lib/calendar";

interface Props {
  items: ReportTrendPoint[];
  bucket: string;
}

interface Point {
  start: Date | null;
  end: Date | null;
  income: number;
  expense: number;
}

const MAX_DAILY_POINTS = 14;
const WEEK_DAYS = 7;

function toWeeks(points: readonly Point[]) {
  const weeks: Point[] = [];

  for (let index = 0; index < points.length; index += WEEK_DAYS) {
    const chunk = points.slice(index, index + WEEK_DAYS);
    weeks.push({
      start: chunk[0]?.start ?? null,
      end: chunk.at(-1)?.start ?? null,
      income: chunk.reduce((sum, point) => sum + point.income, 0),
      expense: chunk.reduce((sum, point) => sum + point.expense, 0),
    });
  }

  return weeks;
}

export function ReportTrendChart({ items, bucket }: Readonly<Props>) {
  const monthFormat = useShortMonth();
  const dayFormat = useShortDay();
  const labelFormat = bucket === "month" ? monthFormat : dayFormat;

  const points: Point[] = items.map((item) => ({
    start: parseIso(item.bucketStart ?? ""),
    end: null,
    income: Number(item.income ?? 0),
    expense: Number(item.expense ?? 0),
  }));
  const shown = bucket === "day" && points.length > MAX_DAILY_POINTS ? toWeeks(points) : points;

  function label(point: Point) {
    if (!point.start) {
      return "";
    }

    return point.end && point.end.getTime() !== point.start.getTime()
      ? labelFormat.formatRange(point.start, point.end)
      : labelFormat.format(point.start);
  }

  return (
    <IncomeExpenseChart
      data={shown.map((point) => ({
        label: label(point),
        income: point.income,
        expense: point.expense,
      }))}
    />
  );
}
