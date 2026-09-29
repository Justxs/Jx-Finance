import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Landmark, Unlink } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDebtsSuspenseQueryOptions, useUnlinkDebtPayment } from "@/api/generated";
import type { TransactionResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import type { RowAction } from "@/components/row-actions/row-actions";
import { buttonVariants } from "@/components/ui/button/button";
import { DebtPaymentForm } from "@/features/net-worth/debt-payments/debt-payments";
import { useFeature } from "@/hooks/use-settings";
import { isOptimistic, isPurchase } from "../transaction-amount";

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

export function useDebtPaymentAction(transaction: TransactionResponse): {
  action?: RowAction;
  dialog: ReactNode;
} {
  const { t } = useTranslation();
  const enabled = useFeature("netWorth");
  const debts = useQuery({ ...getDebtsSuspenseQueryOptions(), enabled }).data ?? [];
  const unlink = useUnlinkDebtPayment();
  const [open, setOpen] = useState(false);
  const tracking = debts.filter((debt) => debt.tracksPayments);
  const paid = transaction.debtPayment;

  if (paid) {
    return {
      action: {
        icon: Unlink,
        label: t("netWorth.payments.unlinkFromDebt"),
        pending: unlink.isPending,
        onSelect: () => unlink.mutate({ id: paid.debtId, paymentId: paid.id }),
      },
      dialog: null,
    };
  }

  if (tracking.length === 0 || !isPurchase(transaction) || transaction.isSplit) {
    return { dialog: null };
  }

  return {
    action: {
      icon: Landmark,
      label: t("netWorth.payments.linkToDebt"),
      disabled: isOptimistic(transaction),
      onSelect: () => setOpen(true),
    },
    dialog: (
      <Modal open={open} onOpenChange={setOpen} title={t("netWorth.payments.linkToDebt")}>
        <DebtPaymentForm
          debts={tracking}
          transactionId={transaction.id}
          onClose={() => setOpen(false)}
        />
      </Modal>
    ),
  };
}
