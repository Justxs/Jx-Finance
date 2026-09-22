import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { RowActions } from "@/components/row-actions/row-actions";
import { Button } from "@/components/ui/button/button";
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

  return (
    <RowActions
      label={label}
      className={className}
      onEdit={() => onEdit(transaction)}
      editDisabled={optimistic}
      onDelete={() => onDelete(transaction.id)}
      deletePending={deletingId === transaction.id}
      deleteDisabled={optimistic || deletingId !== null}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={optimistic}
        onClick={() => onDuplicate(transaction)}
        aria-label={`${t("transactions.duplicate")}: ${label}`}
      >
        <Copy />
      </Button>
    </RowActions>
  );
}
