import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getGetDebtsEndpointQueryKey,
  getGetNetWorthEndpointQueryKey,
  getGetNetWorthHistoryEndpointQueryKey,
  useDeleteDebtEndpoint,
  useGetDebtsEndpoint,
} from "@/api/generated";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDate, useMoney } from "@/hooks/use-formatters";
import { DebtForm } from "./debt-form";

export function DebtsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const money = useMoney();
  const date = useDate();
  const [addOpen, setAddOpen] = useState(false);

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
    content = <Skeleton className="m-6 h-16" />;
  } else if (debtList.length === 0) {
    content = <p className="px-6 py-6 text-sm text-muted-foreground">{t("netWorth.noDebts")}</p>;
  } else {
    content = (
      <ul className="divide-y divide-border">
        {debtList.map((debt) => (
          <li
            key={debt.id}
            className="flex flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 break-words">
              <p className="font-medium">{debt.name}</p>
              <p className="text-xs text-muted-foreground">
                {t(`netWorth.debtTypes.${debt.type}`)} · {date.format(new Date(debt.asOf!))}
                {debt.interestRate ? ` · ${debt.interestRate}%` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold tabular-nums text-destructive">
                {money.format(Number(debt.outstandingAmount))}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: debt.id! })}
                aria-label={t("actions.delete")}
                title={t("actions.delete")}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-6">
        <h2 className="font-semibold">{t("netWorth.addDebt")}</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus />
          {t("actions.add")}
        </Button>
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen} title={t("netWorth.addDebt")}>
        <DebtForm
          onCreated={() => {
            invalidate();
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Dialog>
      {content}
    </section>
  );
}
