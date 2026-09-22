import { useTranslation } from "react-i18next";
import { useRecurringBillsSuspense } from "@/api/generated";
import { TimelineRow } from "@/components/timeline-row/timeline-row";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Tag } from "@/components/ui/tag/tag";
import { TextLink } from "@/components/ui/text-link/text-link";
import { EMPTY_VALUE, useMoney, useShortDayIso } from "@/hooks/use-formatters";
import { useTodayDate } from "@/hooks/use-settings";
import { toIso } from "@/lib/calendar";

const MAX_ROWS = 5;

export function UpcomingBills() {
  const { t } = useTranslation();
  const money = useMoney();
  const todayIso = toIso(useTodayDate());
  const formatDay = useShortDayIso();
  const bills = useRecurringBillsSuspense();

  const rows = (bills.data ?? [])
    .filter((bill) => bill.isActive)
    .toSorted((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
    .slice(0, MAX_ROWS);

  if (rows.length === 0) {
    return (
      <EmptyText>
        {t("dashboard.noBills")}{" "}
        <TextLink to="/recurring-bills">{t("nav.recurringBills")}</TextLink>
      </EmptyText>
    );
  }

  return (
    <Rows>
      {rows.map((bill) => {
        const overdue = bill.nextDueDate < todayIso;
        return (
          <TimelineRow
            key={bill.id}
            day={formatDay(bill.nextDueDate)}
            title={bill.name}
            badge={overdue ? <Tag tone="negative">{t("dashboard.overdue")}</Tag> : null}
            amount={
              <span className="shrink-0 text-right font-medium tabular-nums">
                {bill.amount === null ? EMPTY_VALUE : money.format(Number(bill.amount))}
              </span>
            }
          />
        );
      })}
    </Rows>
  );
}
