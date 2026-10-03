import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getAccountsSuspenseQueryOptions,
  getHouseholdsSuspenseQueryOptions,
  getMeQueryOptions,
} from "@/api/generated";
import type { TransactionResponse } from "@/api/generated/model";
import { EditModal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import type { RowAction } from "@/components/row-actions/row-actions";
import { Button } from "@/components/ui/button/button";
import { TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { useMoney } from "@/hooks/use-formatters";
import { useFeature } from "@/hooks/use-settings";
import { isOptimistic, isPurchase } from "@/lib/transaction-row";
import { cn } from "@/lib/utils";
import { SplitExpenseForm } from "./split-expense-dialog";

export function useSharedExpenseSplits() {
  const { t } = useTranslation();
  const enabled = useFeature("households");
  const households = useQuery({ ...getHouseholdsSuspenseQueryOptions(), enabled }).data ?? [];
  const accounts = useQuery({ ...getAccountsSuspenseQueryOptions(), enabled }).data ?? [];
  const me = useQuery({ ...getMeQueryOptions(), enabled }).data;
  const [splitting, setSplitting] = useState<TransactionResponse | null>(null);

  function title(transaction: TransactionResponse) {
    return transaction.sharedExpense ? t("households.split.edit") : t("households.split.action");
  }

  function actionFor(transaction: TransactionResponse): RowAction | undefined {
    const account = accounts.find((item) => item.id === transaction.accountId);
    if (
      households.length === 0 ||
      transaction.contactSplit ||
      !isPurchase(transaction) ||
      !me ||
      account?.ownerId !== me.id
    ) {
      return undefined;
    }
    return {
      icon: Users,
      label: title(transaction),
      disabled: isOptimistic(transaction),
      onSelect: () => setSplitting(transaction),
    };
  }

  const dialog = (
    <EditModal item={splitting} onClose={() => setSplitting(null)} title={title}>
      {(transaction, close) => (
        <QueryBoundary fallback={<TextSkeleton size="sm" width="w-2/3" />}>
          <SplitExpenseForm transaction={transaction} onClose={close} />
        </QueryBoundary>
      )}
    </EditModal>
  );

  return { actionFor, open: setSplitting, dialog };
}

interface MarkProps {
  transaction: TransactionResponse;
  onUpdate: (transaction: TransactionResponse) => void;
  className?: string;
}

export function SharedExpenseMark({ transaction, onUpdate, className }: Readonly<MarkProps>) {
  const { t } = useTranslation();
  const money = useMoney();
  const split = transaction.sharedExpense;
  if (!split) {
    return null;
  }

  const label = t("households.split.mark", {
    household: split.householdName,
    amount: money.format(Number(split.myShare), transaction.currency),
  });

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Tooltip content={label}>
        <span className="inline-flex text-muted-foreground">
          <Users className="size-3.5" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </span>
      </Tooltip>
      {split.amountDiffers ? (
        <>
          <span className="sr-only">{t("households.split.differs")}</span>
          <Tooltip content={t("households.split.differs")}>
            <Button
              type="button"
              variant="link"
              size="inline"
              onClick={() => onUpdate(transaction)}
            >
              {t("households.split.update")}
            </Button>
          </Tooltip>
        </>
      ) : null}
    </span>
  );
}
