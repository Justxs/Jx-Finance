import { useQueryClient } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import {
  getGetDebtsEndpointQueryKey,
  getGetNetWorthEndpointQueryKey,
  getGetNetWorthHistoryEndpointQueryKey,
  useDeleteDebtEndpoint,
  useGetDebtsEndpointSuspense,
} from "@/api/generated";
import { useIsoDate, useRatePercent } from "@/hooks/use-formatters";
import { HoldingsSection } from "../holdings-section";
import { DebtForm } from "./debt-form";

export function DebtsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const formatDate = useIsoDate();
  const formatRate = useRatePercent();
  const debts = useGetDebtsEndpointSuspense();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetDebtsEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetNetWorthEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetNetWorthHistoryEndpointQueryKey() });
  }

  const deleteMutation = useDeleteDebtEndpoint({ mutation: { onSettled: invalidate } });
  const debtList = useDeferredValue(debts.data);

  return (
    <HoldingsSection
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
          debt.interestRate ? formatRate(Number(debt.interestRate)) : null,
        ]
          .filter(Boolean)
          .join(" · "),
        amount: Number(debt.outstandingAmount),
        values: {
          name: debt.name ?? "",
          type: debt.type,
          amount: debt.outstandingAmount,
          interestRate: debt.interestRate === null ? "" : String(debt.interestRate),
          asOf: debt.asOf,
        },
      }))}
      deletingId={deleteMutation.isPending ? deleteMutation.variables?.id : undefined}
      deleteDisabled={deleteMutation.isPending}
      onDelete={(id) => deleteMutation.mutate({ id })}
      onCreated={invalidate}
      form={DebtForm}
    />
  );
}
