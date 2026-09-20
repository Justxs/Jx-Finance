import { useTranslation } from "react-i18next";
import { useRecurringBillsSuspense } from "@/api/generated";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Tag } from "@/components/ui/tag/tag";
import { TextLink } from "@/components/ui/text-link/text-link";
import { EMPTY_VALUE, useMoney, useShortDay } from "@/hooks/use-formatters";
import { useTodayDate } from "@/hooks/use-settings";
import { parseIso, toIso } from "@/lib/calendar";

const MAX_ROWS = 5;

export function UpcomingBills() {
  const { t } = useTranslation();
  const money = useMoney();
  const todayIso = toIso(useTodayDate());
  const dayFormat = useShortDay();
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

  function formatDay(value: string) {
    const parsed = parseIso(value);
    return parsed ? dayFormat.format(parsed) : value;
  }

  return (
    <Rows>
      {rows.map((bill) => {
        const overdue = bill.nextDueDate < todayIso;
        return (
          <li key={bill.id} className="flex items-baseline gap-4 py-2.5 text-sm">
            <span className="w-14 shrink-0 text-muted-foreground tabular-nums">
              {formatDay(bill.nextDueDate)}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium" title={bill.name}>
              {bill.name}
            </span>
            {overdue ? <Tag tone="negative">{t("dashboard.overdue")}</Tag> : null}
            <span className="shrink-0 text-right font-medium tabular-nums">
              {bill.amount === null ? EMPTY_VALUE : money.format(Number(bill.amount))}
            </span>
          </li>
        );
      })}
    </Rows>
  );
}
