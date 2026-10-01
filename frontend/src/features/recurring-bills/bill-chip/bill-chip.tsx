import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRecurringBillsSuspense } from "@/api/generated";
import type {
  BillOccurrence,
  BillOccurrenceStatus,
  RecurringBillResponse,
  RecurringBillShape,
} from "@/api/generated/model";
import { TransactionsLink } from "@/components/transactions-link/transactions-link";
import { Button } from "@/components/ui/button/button";
import { Tag } from "@/components/ui/tag/tag";
import { useMoney } from "@/hooks/use-formatters";
import { INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";

const shapeIcons = {
  expense: ArrowUpRight,
  income: ArrowDownLeft,
  transfer: ArrowLeftRight,
} as const satisfies Record<RecurringBillShape, unknown>;

const statusTones = {
  due: null,
  overdue: "negative",
  paid: "positive",
  noMatch: "neutral",
} as const satisfies Record<BillOccurrenceStatus, "negative" | "positive" | "neutral" | null>;

const nameClass =
  "min-w-0 truncate rounded-sm text-left font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

interface Props {
  occurrence: BillOccurrence;
  onConfirm: (bill: RecurringBillResponse) => void;
  onEdit: (bill: RecurringBillResponse) => void;
  onMarkDone: (occurrence: BillOccurrence) => void;
  markingDone?: string | null;
}

function ChipName({
  occurrence,
  onConfirm,
  onEdit,
}: Readonly<Pick<Props, "occurrence" | "onConfirm" | "onEdit">>) {
  const bill = useRecurringBillsSuspense().data.find((item) => item.id === occurrence.billId);

  if (occurrence.status === "paid") {
    return (
      <TransactionsLink
        name={occurrence.name}
        filter={{
          accountId: occurrence.accountId ?? undefined,
          dateFrom: occurrence.date,
          dateTo: occurrence.date,
        }}
        className={nameClass}
      />
    );
  }

  if (!bill) {
    return (
      <span className="min-w-0 truncate font-medium" title={occurrence.name}>
        {occurrence.name}
      </span>
    );
  }

  return (
    <button
      type="button"
      title={occurrence.name}
      className={nameClass}
      onClick={() => (occurrence.isNextDue ? onConfirm(bill) : onEdit(bill))}
    >
      {occurrence.name}
    </button>
  );
}

function ChipAmount({ occurrence }: Readonly<{ occurrence: BillOccurrence }>) {
  const { t } = useTranslation();
  const money = useMoney();

  if (occurrence.amount === null) {
    return (
      <span className="text-muted-foreground">{t("recurringBills.calendar.amountUnknown")}</span>
    );
  }

  const value = Number(occurrence.amount);
  const currency = occurrence.currency ?? undefined;
  const income = occurrence.shape === "income";
  return (
    <span className={cn("font-medium whitespace-nowrap tabular-nums", income && INCOME_TONE)}>
      {occurrence.estimated ? (
        <>
          <span aria-hidden="true">≈ </span>
          <span className="sr-only">{t("forecast.estimated")} </span>
        </>
      ) : null}
      {income ? money.formatSigned(value, "+", currency) : money.format(value, currency)}
    </span>
  );
}

export function BillChip({
  occurrence,
  onConfirm,
  onEdit,
  onMarkDone,
  markingDone = null,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const ShapeIcon = shapeIcons[occurrence.shape];
  const tone = statusTones[occurrence.status];
  const status = t(`recurringBills.calendar.${occurrence.status}`);
  const muted = occurrence.status === "noMatch";
  const note = [
    occurrence.unconfirmed ? t("recurringBills.calendar.unconfirmed") : null,
    occurrence.accountNotVisible ? t("recurringBills.calendar.accountNotVisible") : null,
  ].filter(Boolean);
  const canMarkDone =
    occurrence.status === "paid" && occurrence.unconfirmed && occurrence.isNextDue;

  return (
    <div
      data-slot="bill-chip"
      className={cn(
        "min-w-0 space-y-0.5 rounded-md border px-1.5 py-1 text-xs",
        occurrence.status === "overdue" ? "border-expense/35" : "border-border",
        muted && "text-muted-foreground",
      )}
    >
      <p className="flex min-w-0 items-center gap-1">
        <ShapeIcon
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0",
            occurrence.shape === "income" ? INCOME_TONE : "text-muted-foreground",
          )}
        />
        <span className="sr-only">{t(`recurringBills.shapes.${occurrence.shape}`)}: </span>
        <ChipName occurrence={occurrence} onConfirm={onConfirm} onEdit={onEdit} />
      </p>
      <p className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-0.5">
        <ChipAmount occurrence={occurrence} />
        {tone ? <Tag tone={tone}>{status}</Tag> : <span className="sr-only">{status}</span>}
      </p>
      {note.length > 0 ? <p className="text-muted-foreground">{note.join(" · ")}</p> : null}
      {canMarkDone ? (
        <Button
          type="button"
          variant="link"
          size="inline"
          aria-label={`${t("recurringBills.markDone")}: ${occurrence.name}`}
          pending={markingDone === occurrence.billId}
          onClick={() => onMarkDone(occurrence)}
        >
          <span className="text-xs">{t("recurringBills.markDone")}</span>
        </Button>
      ) : null}
    </div>
  );
}
