import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Landmark, Unlink } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getDebtsSuspenseQueryOptions, useUnlinkDebtPayment } from "@/api/generated";
import type { TransactionResponse } from "@/api/generated/model";
import { EditModal } from "@/components/modal";
import type { RowAction } from "@/components/row-actions/row-actions";
import { buttonVariants } from "@/components/ui/button/button";
import { DebtPaymentForm } from "@/features/net-worth/debt-payment-form/debt-payment-form";
import {
  isOptimistic,
  isPurchase,
} from "@/features/transactions/transaction-amount/transaction-row";
import { useFeature } from "@/hooks/use-settings";

interface Props {
  transaction: TransactionResponse;
}

export function DebtPaymentMarker({
  transaction,
  className,
}: Readonly<Props & { className?: string }>) {
  const { t } = useTranslation();
  const paid = transaction.debtPayment;
  if (!paid) {
    return null;
  }

  const label = t("netWorth.payments.pays", { name: paid.debtName });
  return (
    <Link
      to="/net-worth/debts/$debtId"
      params={{ debtId: paid.debtId }}
      aria-label={label}
      title={label}
      className={buttonVariants({ variant: "link", size: "inline", className })}
    >
      <Landmark className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

export function useDebtPaymentLinks() {
  const { t } = useTranslation();
  const enabled = useFeature("netWorth");
  const debts = useQuery({ ...getDebtsSuspenseQueryOptions(), enabled }).data ?? [];
  const unlink = useUnlinkDebtPayment();
  const [linking, setLinking] = useState<TransactionResponse | null>(null);
  const tracking = debts.filter((debt) => debt.tracksPayments);

  function actionFor(transaction: TransactionResponse): RowAction | undefined {
    const paid = transaction.debtPayment;
    if (paid) {
      return {
        icon: Unlink,
        label: t("netWorth.payments.unlinkFromDebt"),
        pending: unlink.isPending && unlink.variables.paymentId === paid.id,
        onSelect: () => unlink.mutate({ id: paid.debtId, paymentId: paid.id }),
      };
    }
    if (tracking.length === 0 || !isPurchase(transaction) || transaction.isSplit) {
      return undefined;
    }
    return {
      icon: Landmark,
      label: t("netWorth.payments.linkToDebt"),
      disabled: isOptimistic(transaction),
      onSelect: () => setLinking(transaction),
    };
  }

  const dialog = (
    <EditModal
      item={linking}
      onClose={() => setLinking(null)}
      title={t("netWorth.payments.linkToDebt")}
    >
      {(transaction, close) => (
        <DebtPaymentForm debts={tracking} transactionId={transaction.id} onClose={close} />
      )}
    </EditModal>
  );

  return { actionFor, dialog };
}
