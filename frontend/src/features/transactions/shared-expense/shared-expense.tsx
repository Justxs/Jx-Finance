import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getAccountsSuspenseQueryOptions,
  getHouseholdsSuspenseQueryOptions,
  getMeQueryOptions,
} from "@/api/generated";
import type { TransactionResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import type { RowAction } from "@/components/row-actions/row-actions";
import { Button } from "@/components/ui/button/button";
import { TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { SplitExpenseForm } from "@/features/households/split-expense-dialog/split-expense-dialog";
import { useMoney } from "@/hooks/use-formatters";
import { useFeature } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { isOptimistic, isPurchase } from "../transaction-amount";

interface DialogProps {
  transaction: TransactionResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SplitDialog({ transaction, open, onOpenChange }: Readonly<DialogProps>) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={transaction.sharedExpense ? t("households.split.edit") : t("households.split.action")}
    >
      <QueryBoundary fallback={<TextSkeleton size="sm" width="w-2/3" />}>
        <SplitExpenseForm transaction={transaction} onClose={() => onOpenChange(false)} />
      </QueryBoundary>
    </Modal>
  );
}

export function useSharedExpenseAction(transaction: TransactionResponse): {
  action?: RowAction;
  dialog: ReactNode;
} {
  const { t } = useTranslation();
  const enabled = useFeature("households");
  const households = useQuery({ ...getHouseholdsSuspenseQueryOptions(), enabled }).data ?? [];
  const accounts = useQuery({ ...getAccountsSuspenseQueryOptions(), enabled }).data ?? [];
  const me = useQuery({ ...getMeQueryOptions(), enabled }).data;
  const [open, setOpen] = useState(false);
  const account = accounts.find((item) => item.id === transaction.accountId);

  if (households.length === 0 || !isPurchase(transaction) || !me || account?.ownerId !== me.id) {
    return { dialog: null };
  }

  return {
    action: {
      icon: Users,
      label: transaction.sharedExpense ? t("households.split.edit") : t("households.split.action"),
      disabled: isOptimistic(transaction),
      onSelect: () => setOpen(true),
    },
    dialog: <SplitDialog transaction={transaction} open={open} onOpenChange={setOpen} />,
  };
}

interface MarkProps {
  transaction: TransactionResponse;
  className?: string;
}

export function SharedExpenseMark({ transaction, className }: Readonly<MarkProps>) {
  const { t } = useTranslation();
  const money = useMoney();
  const [open, setOpen] = useState(false);
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
            <Button type="button" variant="link" size="inline" onClick={() => setOpen(true)}>
              {t("households.split.update")}
            </Button>
          </Tooltip>
          <SplitDialog transaction={transaction} open={open} onOpenChange={setOpen} />
        </>
      ) : null}
    </span>
  );
}
