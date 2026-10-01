import { Copy, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { type RowAction, RowActions } from "@/components/row-actions/row-actions";
import { useDebtPaymentLinks } from "@/features/transactions/debt-payment/debt-payment";
import { useGroupRowActions } from "@/features/transactions/group-dialog/group-dialog";
import { usePayeeNaming } from "@/features/transactions/payee-naming/payee-naming";
import { useSharedExpenseSplits } from "@/features/transactions/shared-expense/shared-expense";
import {
  isOptimistic,
  isPurchase,
} from "@/features/transactions/transaction-amount/transaction-row";

export function useTransactionRowDialogs() {
  const debt = useDebtPaymentLinks();
  const split = useSharedExpenseSplits();
  const payee = usePayeeNaming();
  const group = useGroupRowActions();

  function moreActions(transaction: TransactionResponse) {
    return [
      debt.actionFor(transaction),
      split.actionFor(transaction),
      payee.actionFor(transaction),
      group.actionFor(transaction),
    ].filter((action) => action !== undefined);
  }

  return {
    moreActions,
    onUpdateSplit: split.open,
    dialogs: (
      <>
        {debt.dialog}
        {split.dialog}
        {payee.dialog}
        {group.dialog}
      </>
    ),
  };
}

interface Props {
  transaction: TransactionResponse;
  label: string;
  moreActions: RowAction[];
  deletingId: string | null;
  onEdit: (transaction: TransactionResponse) => void;
  onDuplicate: (transaction: TransactionResponse) => void;
  onRefund: (transaction: TransactionResponse) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function TransactionRowActions({
  transaction,
  label,
  moreActions,
  deletingId,
  onEdit,
  onDuplicate,
  onRefund,
  onDelete,
  className,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const optimistic = isOptimistic(transaction);
  const duplicate = {
    icon: Copy,
    label: t("transactions.duplicate"),
    disabled: optimistic,
    onSelect: () => onDuplicate(transaction),
  };
  const refund = isPurchase(transaction)
    ? [
        {
          icon: Undo2,
          label: t("transactions.recordRefund"),
          disabled: optimistic,
          onSelect: () => onRefund(transaction),
        },
      ]
    : [];

  return (
    <RowActions
      label={label}
      className={className}
      actions={[...moreActions, duplicate, ...refund]}
      onEdit={() => onEdit(transaction)}
      editDisabled={optimistic}
      onDelete={() => onDelete(transaction.id)}
      deletePending={deletingId === transaction.id}
      deleteDisabled={optimistic || deletingId !== null}
    />
  );
}
