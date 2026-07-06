import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse, TransactionResponse } from "@/api/generated/model";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionForm, type TransactionFormValues } from "./transaction-form";

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  isLoadingOptions: boolean;
  editing: TransactionResponse | null;
  onCancelEdit: () => void;
  updatePending: boolean;
  onCreate: (values: TransactionFormValues) => void;
  onUpdate: (values: TransactionFormValues) => void;
}

export function TransactionFormSection({
  accounts,
  categories,
  isLoadingOptions,
  editing,
  onCancelEdit,
  updatePending,
  onCreate,
  onUpdate,
}: Readonly<Props>) {
  const { t } = useTranslation();

  let content: ReactNode;
  if (isLoadingOptions) {
    content = (
      <div className="grid gap-4 md:grid-cols-6">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    );
  } else if (accounts.length === 0) {
    content = <p className="text-sm text-muted-foreground">{t("transactions.needAccount")}</p>;
  } else if (editing) {
    content = (
      <TransactionForm
        key={editing.id}
        accounts={accounts}
        categories={categories}
        initial={editing}
        pending={updatePending}
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
      />
    );
  } else {
    content = <TransactionForm accounts={accounts} categories={categories} pending={false} onSubmit={onCreate} />;
  }

  return (
    <section className="card p-6">
      <h2 className="mb-5 font-semibold">{editing ? t("transactions.editTitle") : t("transactions.add")}</h2>
      {content}
    </section>
  );
}
