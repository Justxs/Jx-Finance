import { Bookmark } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import { SavedListMenu } from "@/features/transactions/saved-list-menu/saved-list-menu";
import {
  isEmptyFilter,
  missingFilterReferences,
} from "@/features/transactions/transaction-queries";
import { savedFilters } from "@/features/transactions/transaction-views";
import type { TransactionFilters } from "@/features/transactions/use-transaction-filters";

interface Props {
  filters: TransactionFilters;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
}

export function SavedFilters({ filters, accounts, categories, tags }: Readonly<Props>) {
  const { t } = useTranslation();
  const saved = savedFilters.useRows();

  const known = {
    accountIds: new Set(accounts.map((account) => account.id)),
    categoryIds: new Set(categories.map((category) => category.id)),
    tagIds: new Set(tags.map((tag) => tag.id)),
  };

  const items = saved.map((row) => ({
    id: row.id,
    name: row.name,
    note:
      missingFilterReferences(row.filter, known).length > 0
        ? t("transactions.savedFilterStale")
        : undefined,
  }));

  return (
    <SavedListMenu
      icon={Bookmark}
      label={t("transactions.savedFilters")}
      items={items}
      emptyText={t("transactions.savedFiltersEmpty")}
      applyHint={t("transactions.applySavedFilter")}
      saveLabel={t("transactions.saveFilter")}
      savePlaceholder={t("transactions.savedFilterNamePlaceholder")}
      saveHint={t("transactions.saveFilterNeedsFilter")}
      canSave={!isEmptyFilter(filters.currentFilter)}
      onSave={(name) => {
        savedFilters.save(name, { filter: filters.currentFilter });
        toast.success(t("transactions.savedFilterSaved"));
      }}
      onApply={(id) => {
        const row = saved.find((candidate) => candidate.id === id);
        if (row) {
          filters.applyFilter(row.filter);
        }
      }}
      onRename={savedFilters.rename}
      onDelete={savedFilters.remove}
    />
  );
}
