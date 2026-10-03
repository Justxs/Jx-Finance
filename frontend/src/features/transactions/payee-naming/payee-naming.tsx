import { Tag } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { EditModal } from "@/components/modal";
import { PayeeNameForm } from "@/components/payee-name-form/payee-name-form";
import type { RowAction } from "@/components/row-actions/row-actions";
import { useFeature } from "@/hooks/use-settings";
import { isOptimistic } from "@/lib/transaction-row";

export function usePayeeNaming() {
  const { t } = useTranslation();
  const [naming, setNaming] = useState<TransactionResponse | null>(null);
  const enabled = useFeature("payeeNames");

  function actionFor(transaction: TransactionResponse): RowAction | undefined {
    if (!enabled || !bankPayee(transaction)) {
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
