import { useTranslation } from "react-i18next";
import { useMoney } from "@/hooks/use-formatters";
import { type ChartSeries, formatSeriesValue } from "./chart-tooltip";

interface Props {
  id: string;
  caption: string;
  data: readonly unknown[];
  labelKey: string;
  series: readonly ChartSeries[];
  formatLabel?: (label: string) => string;
  currency?: string;
}

function valueOf(row: unknown, key: string): unknown {
  return typeof row === "object" && row !== null
    ? Object.getOwnPropertyDescriptor(row, key)?.value
    : undefined;
}

export function ChartDataTable({
  id,
  caption,
  data,
  labelKey,
  series,
  formatLabel,
  currency,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();

  return (
    <div className="sr-only">
      <table id={id}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t("charts.period")}</th>
            {series.map((item) => (
              <th key={item.key} scope="col">
                {item.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const raw = valueOf(row, labelKey);
            const label = typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
            return (
              <tr key={label}>
                <th scope="row">{formatLabel ? formatLabel(label) : label}</th>
                {series.map((item) => {
                  const value = valueOf(row, item.key);
                  return (
                    <td key={item.key}>
                      {typeof value === "number"
                        ? formatSeriesValue(money, item, value, currency)
                        : ""}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
