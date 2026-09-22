import { Bookmark } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import {
  deleteSavedFilter,
  renameSavedFilter,
  saveFilter,
  useSavedFilters,
} from "@/stores/transaction-views";
import { SavedListMenu } from "../saved-list-menu/saved-list-menu";
import { isEmptyFilter, missingFilterReferences } from "../transaction-queries";
import { useTransactionFilters } from "../use-transaction-filters";

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
  className?: string;
  defaultOpen?: boolean;
}

export function SavedFilters({
  accounts,
  categories,
  tags,
  className,
  defaultOpen,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const filters = useTransactionFilters({ accounts, categories });
  const saved = useSavedFilters();

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
      className={className}
      defaultOpen={defaultOpen}
      label={t("transactions.savedFilters")}
      items={items}
      emptyText={t("transactions.savedFiltersEmpty")}
      applyHint={t("transactions.applySavedFilter")}
      saveLabel={t("transactions.saveFilter")}
      savePlaceholder={t("transactions.savedFilterNamePlaceholder")}
      saveHint={t("transactions.saveFilterNeedsFilter")}
      canSave={!isEmptyFilter(filters.currentFilter)}
      onSave={(name) => {
        saveFilter(name, filters.currentFilter);
        toast.success(t("transactions.savedFilterSaved"));
      }}
      onApply={(id) => {
        const row = saved.find((candidate) => candidate.id === id);
        if (row) {
          filters.applyFilter(row.filter);
        }
      }}
      onRename={renameSavedFilter}
      onDelete={deleteSavedFilter}
    />
  );
}
