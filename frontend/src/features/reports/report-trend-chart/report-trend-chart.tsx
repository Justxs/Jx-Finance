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
  comparisonIncome: number | null;
  comparisonExpense: number | null;
}

const MAX_DAILY_POINTS = 14;
const WEEK_DAYS = 7;

function sumOf(points: readonly Point[], pick: (point: Point) => number | null) {
  if (points.every((point) => pick(point) === null)) {
    return null;
  }
  return points.reduce((sum, point) => sum + (pick(point) ?? 0), 0);
}

function toWeeks(points: readonly Point[]) {
  const weeks: Point[] = [];

  for (let index = 0; index < points.length; index += WEEK_DAYS) {
    const chunk = points.slice(index, index + WEEK_DAYS);
    weeks.push({
      start: chunk[0]?.start ?? null,
      end: chunk.at(-1)?.start ?? null,
      income: chunk.reduce((sum, point) => sum + point.income, 0),
      expense: chunk.reduce((sum, point) => sum + point.expense, 0),
      comparisonIncome: sumOf(chunk, (point) => point.comparisonIncome),
      comparisonExpense: sumOf(chunk, (point) => point.comparisonExpense),
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
    comparisonIncome: item.comparisonIncome == null ? null : Number(item.comparisonIncome),
    comparisonExpense: item.comparisonExpense == null ? null : Number(item.comparisonExpense),
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
        ...(point.comparisonIncome === null ? {} : { comparisonIncome: point.comparisonIncome }),
        ...(point.comparisonExpense === null ? {} : { comparisonExpense: point.comparisonExpense }),
      }))}
    />
  );
}
