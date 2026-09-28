import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { RowActions } from "@/components/row-actions/row-actions";
import { useDebtPaymentAction } from "../debt-payment/debt-payment";
import { isOptimistic } from "../transaction-amount";

interface Props {
  transaction: TransactionResponse;
  label: string;
  deletingId: string | null;
  onEdit: (transaction: TransactionResponse) => void;
  onDuplicate: (transaction: TransactionResponse) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function TransactionRowActions({
  transaction,
  label,
  deletingId,
  onEdit,
  onDuplicate,
  onDelete,
  className,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const optimistic = isOptimistic(transaction);
  const debt = useDebtPaymentAction(transaction);
  const duplicate = {
    icon: Copy,
    label: t("transactions.duplicate"),
    disabled: optimistic,
    onSelect: () => onDuplicate(transaction),
  };

  return (
    <>
      <RowActions
        label={label}
        className={className}
        actions={debt.action ? [debt.action, duplicate] : [duplicate]}
        onEdit={() => onEdit(transaction)}
        editDisabled={optimistic}
        onDelete={() => onDelete(transaction.id)}
        deletePending={deletingId === transaction.id}
        deleteDisabled={optimistic || deletingId !== null}
      />
      {debt.dialog}
    </>
  );
}
