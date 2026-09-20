import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useRecurringBillsSuspense } from "@/api/generated";
import { Rows } from "@/components/ui/rows";
import { Tag } from "@/components/ui/tag";
import { EMPTY_VALUE, useMoney } from "@/hooks/use-formatters";
import { useTodayDate } from "@/hooks/use-settings";
import { parseIso, toIso } from "@/lib/calendar";

const MAX_ROWS = 5;

export function UpcomingBills() {
  const { t, i18n } = useTranslation();
  const money = useMoney();
  const todayIso = toIso(useTodayDate());
  const dayFormat = new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" });
  const bills = useRecurringBillsSuspense();

  const rows = (bills.data ?? [])
    .filter((bill) => bill.isActive)
    .toSorted((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
    .slice(0, MAX_ROWS);

  if (rows.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        {t("dashboard.noBills")}{" "}
        <Link
          to="/recurring-bills"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("nav.recurringBills")}
        </Link>
      </p>
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
