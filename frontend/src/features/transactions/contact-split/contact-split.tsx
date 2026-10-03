import { useQuery } from "@tanstack/react-query";
import { UserRoundPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getAccountsSuspenseQueryOptions,
  getContactsSuspenseQueryOptions,
  getMeQueryOptions,
} from "@/api/generated";
import type { TransactionResponse } from "@/api/generated/model";
import { EditModal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import type { RowAction } from "@/components/row-actions/row-actions";
import { TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { ContactSplitForm } from "@/features/households/contact-split-form/contact-split-form";
import {
  isOptimistic,
  isPurchase,
} from "@/features/transactions/transaction-amount/transaction-row";
import { useSettings } from "@/hooks/use-settings";

export function useContactSplits() {
  const { t } = useTranslation();
  const { features } = useSettings();
  const enabled = features.households && features.people;
  const contacts = useQuery({ ...getContactsSuspenseQueryOptions(), enabled }).data ?? [];
  const accounts = useQuery({ ...getAccountsSuspenseQueryOptions(), enabled }).data ?? [];
  const me = useQuery({ ...getMeQueryOptions(), enabled }).data;
  const [splitting, setSplitting] = useState<TransactionResponse | null>(null);

  function title(transaction: TransactionResponse) {
    return transaction.contactSplit
      ? t("households.people.split.edit")
      : t("households.people.split.action");
  }

  function actionFor(transaction: TransactionResponse): RowAction | undefined {
    const account = accounts.find((item) => item.id === transaction.accountId);
    if (
      contacts.length === 0 ||
      transaction.sharedExpense ||
      !isPurchase(transaction) ||
      !me ||
      account?.ownerId !== me.id
    ) {
      return undefined;
    }
    return {
      icon: UserRoundPlus,
      label: title(transaction),
      disabled: isOptimistic(transaction),
      onSelect: () => setSplitting(transaction),
    };
  }

  const dialog = (
    <EditModal item={splitting} onClose={() => setSplitting(null)} title={title}>
      {(transaction, close) => (
        <QueryBoundary fallback={<TextSkeleton size="sm" width="w-2/3" />}>
          <ContactSplitForm transaction={transaction} onClose={close} />
        </QueryBoundary>
      )}
    </EditModal>
  );

  return { actionFor, dialog };
}
