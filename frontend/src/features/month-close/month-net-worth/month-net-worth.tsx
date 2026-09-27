import { useTranslation } from "react-i18next";
import type { NetWorthSnapshotItem } from "@/api/generated/model";
import { ChangeBadge } from "@/components/change-badge/change-badge";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { TitledSection } from "@/components/ui/section/section";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { changeOf } from "@/lib/comparison";

interface Props {
  start: NetWorthSnapshotItem | null;
  end: NetWorthSnapshotItem | null;
}

export function MonthNetWorth({ start, end }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const isoDate = useIsoDate();

  return (
    <TitledSection title={t("monthClose.netWorth.title")} bodyGap="sm">
      {start && end ? (
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className="font-serif text-stat font-semibold lining-nums tabular-nums">
              {money.format(Number(end.netWorth))}
            </p>
            <ChangeBadge
              change={changeOf(end.netWorth, start.netWorth)}
              good="up"
              className="text-base"
            />
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("monthClose.netWorth.change", {
              from: money.format(Number(start.netWorth)),
              to: money.format(Number(end.netWorth)),
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("monthClose.netWorth.since", { start: isoDate(start.date), end: isoDate(end.date) })}
          </p>
        </div>
      ) : (
        <EmptyText>{t("monthClose.netWorth.noHistory")}</EmptyText>
      )}
    </TitledSection>
  );
}
