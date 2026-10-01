import { CalendarCheck, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  RecurringBillResponse,
  RecurringBillShape,
} from "@/api/generated/model";
import { type DeleteProps, RowActions } from "@/components/row-actions/row-actions";
import { SharedScopeTag } from "@/components/shared-scope-tag/shared-scope-tag";
import { Button } from "@/components/ui/button/button";
import { Tag } from "@/components/ui/tag/tag";
import { urgencyOf } from "@/features/recurring-bills/bill-groups";
import { BillRowLayout } from "@/features/recurring-bills/bill-row-layout";
import { useIsoDate, useMoney, useRelativeDays } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { daysBetween } from "@/lib/calendar";
import { EXPENSE_TONE } from "@/lib/tone";
import { cn, metaLine } from "@/lib/utils";

const shapeTone = {
  expense: "negative",
  income: "positive",
  transfer: "accent",
} as const satisfies Record<RecurringBillShape, "negative" | "positive" | "accent">;

interface Props extends DeleteProps {
  bill: RecurringBillResponse;
  accountById: ReadonlyMap<string, AccountResponse>;
  categoryNames: ReadonlyMap<string, string>;
  onEdit: () => void;
  onConfirm: () => void;
  onMarkDone?: () => void;
  markDonePending?: boolean;
  onUpdateAmount?: (amount: string) => void;
  updatePending?: boolean;
}

export function RecurringBillRow({
  bill,
  accountById,
  categoryNames,
  onEdit,
  onConfirm,
  onMarkDone,
  markDonePending = false,
  onUpdateAmount,
  updatePending = false,
  ...deleteProps
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const relativeDays = useRelativeDays();

  const account = accountById.get(bill.accountId ?? "");
  const toAccount = accountById.get(bill.toAccountId ?? "");

  const today = useToday();
  const days = daysBetween(today, bill.nextDueDate);
  const urgency = urgencyOf(bill, today);
  const overdue = bill.isActive && urgency === "overdue";
  const soon = bill.isActive && days !== null && urgency !== "later" ? relativeDays(days) : null;
  const isTransfer = bill.shape === "transfer";
  const rise = bill.latestMatch?.isPriceRise && bill.latestMatch.expected ? bill.latestMatch : null;
  const currency = account?.currency;
  const markDone =
    onMarkDone && bill.isActive && urgency !== "later"
      ? [
          {
            icon: CalendarCheck,
            label: t("recurringBills.markDone"),
            onSelect: onMarkDone,
            pending: markDonePending,
          },
        ]
      : [];

  const meta = metaLine(
    t(`recurringBills.cadences.${bill.cadence}`),
    bill.amount ? t(`recurringBills.kinds.${bill.kind}`) : null,
    categoryNames.get(bill.categoryId ?? ""),
    isTransfer && account && toAccount ? `${account.name} → ${toAccount.name}` : account?.name,
  );

  return (
    <BillRowLayout
      heading={
        <>
          <p
            className={cn(
              "min-w-0 font-medium wrap-break-word",
              !bill.isActive && "text-muted-foreground",
            )}
          >
            {bill.name}
          </p>
          <Tag tone={shapeTone[bill.shape]}>{t(`recurringBills.shapes.${bill.shape}`)}</Tag>
          {bill.isActive ? null : <Tag tone="neutral">{t("recurringBills.inactive")}</Tag>}
          {overdue ? <Tag tone="negative">{t("recurringBills.overdue")}</Tag> : null}
          <SharedScopeTag scope={bill.scope} householdId={bill.householdId} />
        </>
      }
      meta={
        <>
          <p className="text-xs wrap-break-word text-muted-foreground">
            <span className={cn("tabular-nums", bill.isActive && "text-foreground")}>
              {t("recurringBills.nextDueDate")}: {formatDate(bill.nextDueDate)}
            </span>
            {soon ? (
              <span className={cn("font-medium", overdue ? EXPENSE_TONE : "text-foreground")}>
                {` (${soon})`}
              </span>
            ) : null}
            {meta ? ` · ${meta}` : ""}
          </p>
          {rise ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <span className="inline-flex items-center gap-1 font-medium text-expense tabular-nums">
                <TrendingUp className="size-3.5 shrink-0" aria-hidden="true" />
                {t("recurringBills.priceRise", {
                  amount: money.format(Number(rise.amount), currency),
                  date: formatDate(rise.date),
                  expected: money.format(Number(rise.expected), currency),
                })}
              </span>
              {bill.kind === "fixed" && onUpdateAmount ? (
                <Button
                  type="button"
                  variant="link"
                  size="inline"
                  pending={updatePending}
                  onClick={() => onUpdateAmount(rise.amount)}
                >
                  {t("recurringBills.updateExpected")}
                </Button>
              ) : null}
            </p>
          ) : null}
        </>
      }
      amount={
        bill.amount ? (
          <span
            className={cn(
              "text-right text-sm font-semibold whitespace-nowrap tabular-nums",
              !bill.isActive && "text-muted-foreground",
            )}
          >
            {money.format(Number(bill.amount))}
          </span>
        ) : (
          <span className="text-right text-sm text-muted-foreground">
            {t("recurringBills.kinds.variable")}
          </span>
        )
      }
      actions={
        <RowActions
          label={bill.name}
          size="icon"
          actions={markDone}
          onEdit={onEdit}
          {...deleteProps}
          className="gap-0"
        >
          <Button
            variant="outline"
            size="sm"
            className="mr-2 sm:min-w-38"
            disabled={!bill.isActive}
            onClick={onConfirm}
          >
            {t(`recurringBills.record.${bill.shape}`)}
          </Button>
        </RowActions>
      }
    />
  );
}
