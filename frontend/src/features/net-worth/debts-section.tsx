import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  getGetDebtsEndpointQueryKey,
  getGetNetWorthEndpointQueryKey,
  getGetNetWorthHistoryEndpointQueryKey,
  useDeleteDebtEndpoint,
  useGetDebtsEndpoint,
} from "@/api/generated";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDate, useMoney } from "@/hooks/use-formatters";
import { DebtForm } from "./debt-form";

export function DebtsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const money = useMoney();
  const date = useDate();

  const debts = useGetDebtsEndpoint();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetDebtsEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetNetWorthEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetNetWorthHistoryEndpointQueryKey() });
  }

  const deleteMutation = useDeleteDebtEndpoint({ mutation: { onSettled: invalidate } });
  const debtList = debts.data ?? [];

  let content: ReactNode;
  if (debts.isPending) {
    content = <Skeleton className="m-6 h-16 w-full" />;
  } else if (debtList.length === 0) {
    content = <p className="px-6 py-6 text-sm text-muted-foreground">{t("netWorth.noDebts")}</p>;
  } else {
    content = (
      <ul className="divide-y divide-border">
        {debtList.map((debt) => (
          <li key={debt.id} className="flex items-center justify-between px-6 py-3">
            <div>
              <p className="font-medium">{debt.name}</p>
              <p className="text-xs text-muted-foreground">
                {t(`netWorth.debtTypes.${debt.type}`)} · {date.format(new Date(debt.asOf!))}
                {debt.interestRate ? ` · ${debt.interestRate}%` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold tabular-nums text-destructive">
                {money.format(Number(debt.outstandingAmount))}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: debt.id! })}
              >
                {t("actions.delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="card">
      <div className="border-b p-6">
        <h2 className="mb-5 font-semibold">{t("netWorth.addDebt")}</h2>
        <DebtForm onCreated={invalidate} />
      </div>
      {content}
    </section>
  );
}
