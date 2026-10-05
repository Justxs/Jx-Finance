import { useTranslation } from "react-i18next";
import { useAccountsSuspense, useRecurringBillsSuspense } from "@/api/generated";
import type { RecurringBillResponse } from "@/api/generated/model";
import { TimelineRow } from "@/components/timeline-row/timeline-row";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Tag } from "@/components/ui/tag/tag";
import { TextLink } from "@/components/ui/text-link/text-link";
import { useMoney, useShortDayIso } from "@/hooks/use-formatters";
import { useTodayDate } from "@/hooks/use-settings";
import { toIso } from "@/lib/calendar";
import { byId } from "@/lib/options";
import { INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";

const MAX_ROWS = 5;

export function UpcomingBills() {
  const { t } = useTranslation();
  const todayIso = toIso(useTodayDate());
  const formatDay = useShortDayIso();
  const bills = useRecurringBillsSuspense();
  const accounts = useAccountsSuspense();
  const accountById = byId(accounts.data);

  const rows = bills.data
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
    <>
      <Rows>
        {rows.map((bill) => {
          const overdue = bill.nextDueDate < todayIso;
          return (
            <TimelineRow
              key={bill.id}
              day={formatDay(bill.nextDueDate)}
              title={bill.name}
              badge={
                <>
                  {bill.shape === "transfer" ? (
                    <Tag tone="accent">{t("recurringBills.shapes.transfer")}</Tag>
                  ) : null}
                  {overdue ? <Tag tone="negative">{t("dashboard.overdue")}</Tag> : null}
                </>
              }
              amount={
                <BillAmount
                  bill={bill}
                  currency={accountById.get(bill.accountId ?? "")?.currency}
                />
              }
            />
          );
        })}
      </Rows>
      <TextLink to="/recurring-bills" search={{ view: "calendar" }} className="mt-3 inline-block">
        {t("dashboard.billsCalendar")}
      </TextLink>
    </>
  );
}

interface BillAmountProps {
  bill: RecurringBillResponse;
  currency: string | undefined;
}

function BillAmount({ bill, currency }: Readonly<BillAmountProps>) {
  const { t } = useTranslation();
  const money = useMoney();

  if (!bill.amount) {
    return (
      <span className="shrink-0 text-right text-muted-foreground">
        {t("recurringBills.kinds.variable")}
      </span>
    );
  }

  const isIncome = bill.shape === "income";
  return (
    <span
      className={cn(
        "shrink-0 text-right font-medium whitespace-nowrap tabular-nums",
        isIncome && INCOME_TONE,
      )}
    >
      {isIncome
        ? money.formatSigned(Number(bill.amount), "+", currency)
        : money.format(Number(bill.amount), currency)}
    </span>
  );
}
