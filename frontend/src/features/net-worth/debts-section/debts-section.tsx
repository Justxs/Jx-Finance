import { Link } from "@tanstack/react-router";
import { CalendarRange } from "lucide-react";
import { useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import { getDebtsQueryKey, useDeleteDebt, useDebtsSuspense } from "@/api/generated";
import type { DebtResponse } from "@/api/generated/model";
import { buttonVariants } from "@/components/ui/button/button";
import { useIsoDate, useRatePercent } from "@/hooks/use-formatters";
import { optimisticRemoval } from "@/lib/optimistic";
import { HoldingsSection } from "../holdings-section";
import { DebtForm, type DebtFormValues, debtFormValues } from "./debt-form";

export function DebtsSection() {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const formatRate = useRatePercent();
  const debts = useDebtsSuspense();

  const deleteMutation = useDeleteDebt({
    mutation: optimisticRemoval<DebtResponse>(getDebtsQueryKey()),
  });
  const debtList = useDeferredValue(debts.data);

  function scheduleLink(debt: DebtResponse) {
    if (debt.payoffDate === null) {
      return null;
    }

    const label = t("netWorth.schedule.open", { name: debt.name });

    return (
      <Link
        to="/net-worth/debts/$debtId"
        params={{ debtId: debt.id }}
        aria-label={label}
        title={label}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <CalendarRange />
      </Link>
    );
  }

  return (
    <HoldingsSection<DebtFormValues>
      title={t("netWorth.debts")}
      addLabel={t("netWorth.addDebt")}
      emptyLabel={t("netWorth.noDebts")}
      tone="expense"
      items={debtList.map((debt) => ({
        id: debt.id,
        name: debt.name ?? "",
        details: [
          t(`netWorth.debtTypes.${debt.type}`),
          formatDate(debt.asOf),
          debt.interestRate ? formatRate(debt.interestRate) : null,
          debt.payoffDate
            ? t("netWorth.repayment.paidOff", { date: formatDate(debt.payoffDate) })
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        amount: Number(debt.outstandingAmount),
        values: debtFormValues(debt),
        action: scheduleLink(debt),
      }))}
      deleteMutation={deleteMutation}
      undoKind="debt"
      form={DebtForm}
    />
  );
}
