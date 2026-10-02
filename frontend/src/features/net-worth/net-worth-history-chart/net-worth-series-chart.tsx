import { useTranslation } from "react-i18next";
import { useNetWorthHistorySuspense } from "@/api/generated";
import type { NetWorthSnapshotItem } from "@/api/generated/model";
import type { ChartSeries } from "@/components/chart";
import {
  type TimeSeriesLine,
  TimeSeriesLineChart,
} from "@/components/chart/time-series-line-chart";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { paceLine, trailingPace } from "@/features/net-worth/net-worth-pace/pace";

export interface NetWorthSeries extends ChartSeries {
  key: Exclude<keyof NetWorthSnapshotItem, "date">;
}

interface Props {
  series: readonly NetWorthSeries[];
  ariaLabel: string;
  legend?: boolean;
  yDomain?: ["auto", "auto"];
  until?: string;
  pace?: boolean;
}

export function NetWorthSeriesChart({ series, until, pace = false, ...chart }: Readonly<Props>) {
  const { t } = useTranslation();
  const history = useNetWorthHistorySuspense();

  const items = history.data.items.filter((item) => until === undefined || item.date <= until);
  if (items.length < 2) {
    return <EmptyText>{t("netWorth.notEnoughHistory")}</EmptyText>;
  }

  const trailing = pace ? trailingPace(items) : null;
  const projection = trailing ? paceLine(trailing) : [];
  const paceSeries: TimeSeriesLine[] =
    trailing && series[0]
      ? [{ ...series[0], key: "pace", label: t("netWorth.pace.line"), comparison: true }]
      : [];

  return (
    <TimeSeriesLineChart
      {...chart}
      legend={chart.legend ?? paceSeries.length > 0}
      data={[
        ...items.map((item) => ({
          date: item.date,
          ...Object.fromEntries(series.map(({ key }) => [key, Number(item[key])])),
          pace: item.date === trailing?.to ? trailing.latest : undefined,
        })),
        ...projection.slice(1).map((point) => ({ date: point.date, pace: point.value })),
      ]}
      series={[...series, ...paceSeries]}
    />
  );
}
