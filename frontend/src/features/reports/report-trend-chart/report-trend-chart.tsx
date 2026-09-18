import { useTranslation } from "react-i18next";
import type { ReportTrendPoint } from "@/api/generated/model";
import { IncomeExpenseChart } from "@/components/chart";
import { parseIso } from "@/lib/calendar";

interface Props {
  items: ReportTrendPoint[];
  bucket: string;
}

export function ReportTrendChart({ items, bucket }: Readonly<Props>) {
  const { i18n } = useTranslation();
  const labelFormat = new Intl.DateTimeFormat(
    i18n.language,
    bucket === "month" ? { month: "short", year: "numeric" } : { day: "numeric", month: "short" },
  );

  const chartData = items.map((item) => {
    const date = parseIso(item.bucketStart ?? "");

    return {
      label: date ? labelFormat.format(date) : "",
      income: Number(item.income ?? 0),
      expense: Number(item.expense ?? 0),
    };
  });

  return <IncomeExpenseChart data={chartData} />;
}
