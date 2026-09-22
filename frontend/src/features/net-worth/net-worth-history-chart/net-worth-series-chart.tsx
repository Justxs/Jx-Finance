import { useTranslation } from "react-i18next";
import { useNetWorthHistorySuspense } from "@/api/generated";
import type { NetWorthSnapshotItem } from "@/api/generated/model";
import type { ChartSeries } from "@/components/chart";
import { TimeSeriesLineChart } from "@/components/chart/time-series-line-chart";
import { EmptyText } from "@/components/ui/empty-text/empty-text";

export interface NetWorthSeries extends ChartSeries {
  key: Exclude<keyof NetWorthSnapshotItem, "date">;
}

interface Props {
  series: readonly NetWorthSeries[];
  ariaLabel: string;
  legend?: boolean;
  baseline?: boolean;
  yDomain?: ["auto", "auto"];
}

export function NetWorthSeriesChart({ series, ...chart }: Readonly<Props>) {
  const { t } = useTranslation();
  const history = useNetWorthHistorySuspense();

  const items = history.data?.items ?? [];
  if (items.length < 2) {
    return <EmptyText>{t("netWorth.notEnoughHistory")}</EmptyText>;
  }

  return (
    <TimeSeriesLineChart
      {...chart}
      data={items.map((item) => ({
        date: item.date,
        ...Object.fromEntries(series.map(({ key }) => [key, Number(item[key])])),
      }))}
      series={series}
    />
  );
}
