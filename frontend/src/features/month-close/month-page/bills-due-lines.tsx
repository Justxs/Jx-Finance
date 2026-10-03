import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRecurringBillsSuspense } from "@/api/generated";
import type { AccountResponse, RecurringBillResponse } from "@/api/generated/model";
import { EditModal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RecurringBillConfirmForm } from "@/components/recurring-bill-confirm-form/recurring-bill-confirm-form";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Button } from "@/components/ui/button/button";
import { Rows } from "@/components/ui/rows/rows";
import { TitledSection } from "@/components/ui/section/section";
import { RowsSkeleton } from "@/components/ui/skeleton/skeleton";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { DoneLine, lineClass } from "./done-line";

interface RowsProps {
  monthEnd: string;
  accounts: AccountResponse[];
}

function BillRows({ monthEnd, accounts }: Readonly<RowsProps>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const [confirming, setConfirming] = useState<RecurringBillResponse | null>(null);
  const due = useDeferredValue(useRecurringBillsSuspense().data)
    .filter((bill) => bill.isActive && bill.nextDueDate <= monthEnd)
    .toSorted((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  function amountOf(bill: RecurringBillResponse) {
    const currency = accounts.find((account) => account.id === bill.accountId)?.currency;
    if (!bill.amount) {
      return <span className="text-muted-foreground">{t("recurringBills.kinds.variable")}</span>;
    }
    return bill.shape === "income" ? (
      <span className={cn("font-semibold", INCOME_TONE)}>
        {money.formatSigned(Number(bill.amount), "+", currency)}
      </span>
    ) : (
      <span className="font-semibold">{money.format(Number(bill.amount), currency)}</span>
    );
  }

  return (
    <>
      <Rows>
        {due.map((bill) => (
          <RowTransition key={bill.id}>
            <li
              tabIndex={-1}
              data-open-line=""
              className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5", lineClass)}
            >
              <span className="min-w-0 flex-1 basis-48">
                <span className="block font-medium wrap-break-word">{bill.name}</span>
                <span className="block text-xs text-muted-foreground tabular-nums">
                  {t("monthClose.page.billDue", { date: formatDate(bill.nextDueDate) })}
                </span>
              </span>
              <span className="ml-auto text-right whitespace-nowrap tabular-nums">
                {amountOf(bill)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-line-control=""
                onClick={() => setConfirming(bill)}
              >
                {t("monthClose.checklist.confirm")}
              </Button>
            </li>
          </RowTransition>
        ))}
      </Rows>
      <EditModal
        item={confirming}
        onClose={() => setConfirming(null)}
        title={t("recurringBills.confirmTitle")}
      >
        {(bill, close) => (
          <RecurringBillConfirmForm bill={bill} accounts={accounts} onClose={close} />
        )}
      </EditModal>
    </>
  );
}

interface Props extends RowsProps {
  count: number;
}

export function BillsDueLines({ monthEnd, accounts, count }: Readonly<Props>) {
  const { t } = useTranslation();
  const title = t("monthClose.page.bills");

  return (
    <TitledSection bodyGap="sm" title={title}>
      {count === 0 ? (
        <DoneLine>{t("monthClose.checklist.noRecurring")}</DoneLine>
      ) : (
        <QueryBoundary fallback={<RowsSkeleton rows={Math.min(count, 3)} />} errorSubject={title}>
          <BillRows monthEnd={monthEnd} accounts={accounts} />
        </QueryBoundary>
      )}
    </TitledSection>
  );
}
