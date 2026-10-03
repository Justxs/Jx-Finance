import { CopyCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useKeepPossibleDuplicates } from "@/api/generated";
import type { TransactionResponse } from "@/api/generated/model";
import type { RowAction } from "@/components/row-actions/row-actions";
import { isOptimistic } from "@/lib/transaction-row";

export function useKeepBoth(offered: boolean) {
  const { t } = useTranslation();
  const keep = useKeepPossibleDuplicates();

  function actionFor(transaction: TransactionResponse): RowAction | undefined {
    if (!offered) {
      return undefined;
    }
    return {
      icon: CopyCheck,
      label: t("transactions.possibleDuplicates.keepBoth"),
      disabled: isOptimistic(transaction) || keep.isPending,
      onSelect: () =>
        keep.mutate(
          { id: transaction.id },
          { onSuccess: () => toast.success(t("transactions.possibleDuplicates.kept")) },
        ),
    };
  }

  return { actionFor };
}
