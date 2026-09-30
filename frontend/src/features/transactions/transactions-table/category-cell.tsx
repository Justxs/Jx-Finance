import { useMutationState } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  getBulkCategorizeTransactionsMutationKey,
  useBulkCategorizeTransactions,
} from "@/api/generated";
import type { CategoryResponse, TransactionResponse } from "@/api/generated/model";
import { BulkCategorizeTransactionsBody } from "@/api/schemas/transactions/transactions.zod";
import { ComboboxField } from "@/components/combobox-field/combobox-field";
import { UNCATEGORIZED_OPTION } from "@/features/transactions/transaction-amount/transaction-row";
import { CategoryIcon } from "@/lib/category-icons";
import { namedOptions } from "@/lib/options";
import { cn } from "@/lib/utils";

const pendingVariables = z.object({ data: BulkCategorizeTransactionsBody });

export function useInlineCategory(onCategorized: (transactionId: string) => void) {
  const mutation = useBulkCategorizeTransactions({
    mutation: {
      onSuccess: (_, { data }) => {
        const [transactionId] = data.transactionIds;
        if (data.categoryId && transactionId) {
          onCategorized(transactionId);
        }
      },
    },
  });
  const pending = useMutationState({
    filters: { mutationKey: getBulkCategorizeTransactionsMutationKey(), status: "pending" },
    select: (entry) => pendingVariables.safeParse(entry.state.variables).data?.data,
  });

  const pendingCategoryIds = new Map(
    pending.flatMap((request) =>
      request ? request.transactionIds.map((id) => [id, request.categoryId] as const) : [],
    ),
  );

  function categorize(transaction: TransactionResponse, categoryId: string | null) {
    if (categoryId !== transaction.categoryId) {
      mutation.mutate({ data: { transactionIds: [transaction.id], categoryId } });
    }
  }

  return { categorize, pendingCategoryIds };
}

interface Props {
  transaction: TransactionResponse;
  categories: CategoryResponse[];
  label: string;
  pendingCategoryId: string | null | undefined;
  onChange: (categoryId: string | null) => void;
}

export function CategoryCell({
  transaction,
  categories,
  label,
  pendingCategoryId,
  onChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const pending = pendingCategoryId !== undefined;
  const categoryId = pending ? pendingCategoryId : transaction.categoryId;
  const typed = categories.filter((category) => category.type === transaction.type);
  const icon = typed.find((category) => category.id === categoryId)?.icon;

  return (
    <span
      className={cn("-ml-2 flex min-w-0 items-center gap-1", pending && "stale")}
      aria-busy={pending}
    >
      {categoryId ? (
        <CategoryIcon icon={icon} className="ml-2 size-3.5 shrink-0 text-muted-foreground" />
      ) : null}
      <span className="min-w-0 flex-1">
        <ComboboxField
          aria-label={t("transactions.categoryFor", { transaction: label })}
          value={categoryId ?? UNCATEGORIZED_OPTION}
          onChange={(next) => onChange(next === UNCATEGORIZED_OPTION ? null : next)}
          options={namedOptions(typed, t("transactions.uncategorized"), UNCATEGORIZED_OPTION)}
          size="sm"
          variant="ghost"
        />
      </span>
    </span>
  );
}
