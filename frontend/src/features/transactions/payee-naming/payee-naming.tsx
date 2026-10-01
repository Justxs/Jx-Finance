import { Tag } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { EditModal } from "@/components/modal";
import type { RowAction } from "@/components/row-actions/row-actions";
import { PayeeNameForm } from "@/features/payees/payee-name-form/payee-name-form";
import { isOptimistic } from "@/features/transactions/transaction-amount/transaction-row";

export function usePayeeNaming() {
  const { t } = useTranslation();
  const [naming, setNaming] = useState<TransactionResponse | null>(null);

  function actionFor(transaction: TransactionResponse): RowAction | undefined {
    if (!bankPayee(transaction)) {
      return undefined;
    }
    return {
      icon: Tag,
      label: transaction.payeeName ? t("payees.rename") : t("payees.nameAction"),
      disabled: isOptimistic(transaction),
      onSelect: () => setNaming(transaction),
    };
  }

  const dialog = (
    <EditModal item={naming} onClose={() => setNaming(null)} title={t("payees.dialogTitle")}>
      {(transaction, close) => (
        <PayeeNameForm
          payee={bankPayee(transaction)}
          initialName={transaction.payeeName}
          onClose={close}
        />
      )}
    </EditModal>
  );

  return { actionFor, dialog };
}

function bankPayee(transaction: TransactionResponse) {
  return (transaction.payee || transaction.description)?.trim() ?? "";
}
