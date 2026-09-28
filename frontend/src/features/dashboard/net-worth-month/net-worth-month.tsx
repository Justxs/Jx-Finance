import { useTranslation } from "react-i18next";
import { useNetWorthHistorySuspense } from "@/api/generated";
import type { NetWorthSnapshotItem } from "@/api/generated/model";
import { NetWorthHistoryChart } from "@/features/net-worth/net-worth-history-chart";
import { useMoney } from "@/hooks/use-formatters";
import { gainTone } from "@/lib/tone";
import { cn } from "@/lib/utils";

function monthChange(
  items: readonly NetWorthSnapshotItem[],
  month: string,
  until: string | undefined,
) {
  const monthStart = `${month}-01`;
  const before = items.findLast((item) => item.date < monthStart);
  const latest = items.findLast((item) => until === undefined || item.date <= until);
  if (!before || !latest || latest.date < monthStart) {
    return undefined;
  }
  return Number(latest.netWorth) - Number(before.netWorth);
}

interface Props {
  month: string;
  until?: string;
}

export function NetWorthMonth({ month, until }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const history = useNetWorthHistorySuspense();
  const change = monthChange(history.data.items, month, until);

  return (
    <div className="space-y-3">
      {change === undefined ? null : (
        <p className="text-sm text-muted-foreground">
          <span className={cn("font-semibold tabular-nums", gainTone(change))}>
            {money.formatSigned(change, "auto")}
          </span>{" "}
          {until === undefined ? t("dashboard.netWorthSoFar") : t("dashboard.netWorthOverMonth")}
        </p>
      )}
      <NetWorthHistoryChart until={until} />
    </div>
  );
}
