import { useTranslation } from "react-i18next";
import { useBulkCategorizeTransactions } from "@/api/generated";
import type { CategoryResponse, TransactionResponse } from "@/api/generated/model";
import { ComboboxField } from "@/components/combobox-field/combobox-field";
import { CategoryIcon } from "@/lib/category-icons";
import { namedOptions } from "@/lib/options";
import { cn } from "@/lib/utils";

const UNCATEGORIZED = "none";

interface Props {
  transaction: TransactionResponse;
  categories: CategoryResponse[];
  label: string;
}

export function CategoryCell({ transaction, categories, label }: Readonly<Props>) {
  const { t } = useTranslation();
  const mutation = useBulkCategorizeTransactions();

  const pendingCategoryId = mutation.isPending ? mutation.variables.data.categoryId : undefined;
  const categoryId = pendingCategoryId === undefined ? transaction.categoryId : pendingCategoryId;
  const typed = categories.filter((category) => category.type === transaction.type);
  const icon = typed.find((category) => category.id === categoryId)?.icon;

  function choose(next: string) {
    const nextCategoryId = next === UNCATEGORIZED ? null : next;
    if (nextCategoryId !== transaction.categoryId) {
      mutation.mutate({
        data: { transactionIds: [transaction.id], categoryId: nextCategoryId },
      });
    }
  }

  return (
    <span
      className={cn("-ml-2 flex min-w-0 items-center gap-1", mutation.isPending && "stale")}
      aria-busy={mutation.isPending}
    >
      {categoryId ? (
        <CategoryIcon icon={icon} className="ml-2 size-3.5 shrink-0 text-muted-foreground" />
      ) : null}
      <span className="min-w-0 flex-1">
        <ComboboxField
          aria-label={t("transactions.categoryFor", { transaction: label })}
          value={categoryId ?? UNCATEGORIZED}
          onChange={choose}
          options={namedOptions(typed, t("transactions.uncategorized"), UNCATEGORIZED)}
          size="sm"
          variant="ghost"
        />
      </span>
    </span>
  );
}
