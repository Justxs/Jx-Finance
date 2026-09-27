import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Landmark, Unlink } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getDebtsSuspenseQueryOptions, useUnlinkDebtPayment } from "@/api/generated";
import type { TransactionResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { Button, buttonVariants } from "@/components/ui/button/button";
import { DebtPaymentForm } from "@/features/net-worth/debt-payments/debt-payments";
import { useFeature } from "@/hooks/use-settings";
import { isOptimistic } from "../transaction-amount";

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

export function DebtPaymentAction({ transaction, label }: Readonly<Props & { label: string }>) {
  const { t } = useTranslation();
  const enabled = useFeature("netWorth");
  const debts = useQuery({ ...getDebtsSuspenseQueryOptions(), enabled }).data ?? [];
  const unlink = useUnlinkDebtPayment();
  const [open, setOpen] = useState(false);
  const tracking = debts.filter((debt) => debt.tracksPayments);
  const paid = transaction.debtPayment;

  if (paid) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        pending={unlink.isPending}
        onClick={() => unlink.mutate({ id: paid.debtId, paymentId: paid.id })}
        aria-label={`${t("netWorth.payments.unlinkFromDebt")}: ${label}`}
      >
        <Unlink />
      </Button>
    );
  }

  if (tracking.length === 0 || transaction.type !== "expense" || transaction.isSplit) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isOptimistic(transaction)}
        onClick={() => setOpen(true)}
        aria-label={`${t("netWorth.payments.linkToDebt")}: ${label}`}
      >
        <Landmark />
      </Button>
      <Modal open={open} onOpenChange={setOpen} title={t("netWorth.payments.linkToDebt")}>
        <DebtPaymentForm
          debts={tracking}
          transactionId={transaction.id}
          onClose={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
