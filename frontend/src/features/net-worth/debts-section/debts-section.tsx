import { useNavigate } from "@tanstack/react-router";
import { CalendarRange } from "lucide-react";
import { useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import { getDebtsQueryKey, useDeleteDebt, useDebtsSuspense } from "@/api/generated";
import type { DebtResponse } from "@/api/generated/model";
import { BalanceItemsSection } from "@/features/net-worth/balance-items-section/balance-items-section";
import { useIsoDate, useRatePercent } from "@/hooks/use-formatters";
import { optimisticRemoval } from "@/lib/optimistic";
import { metaLine } from "@/lib/utils";
import { DebtForm } from "./debt-form";

export function DebtsSection() {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const formatRate = useRatePercent();
  const debts = useDebtsSuspense();
  const navigate = useNavigate();

  const deleteMutation = useDeleteDebt({
    mutation: optimisticRemoval<DebtResponse>(getDebtsQueryKey()),
  });
  const debtList = useDeferredValue(debts.data);

  return (
    <BalanceItemsSection
      title={t("netWorth.debts")}
      addLabel={t("netWorth.addDebt")}
      emptyLabel={t("netWorth.noDebts")}
      tone="expense"
      items={debtList.map((debt) => ({
        id: debt.id,
        name: debt.name,
        details: metaLine(
          t(`netWorth.debtTypes.${debt.type}`),
          formatDate(debt.asOf),
          debt.interestRate ? formatRate(debt.interestRate) : null,
          debt.payoffDate
            ? t("netWorth.repayment.paidOff", { date: formatDate(debt.payoffDate) })
            : null,
        ),
        amount: Number(debt.trackedBalance ?? debt.outstandingAmount),
        currency: debt.currency,
        record: debt,
        action: {
          icon: CalendarRange,
          label: t("netWorth.schedule.open"),
          onSelect: () => navigate({ to: "/net-worth/debts/$debtId", params: { debtId: debt.id } }),
        },
        scope: debt.scope,
        householdId: debt.householdId,
      }))}
      deleteMutation={deleteMutation}
      undoKind="debt"
      form={DebtForm}
    />
  );
}
