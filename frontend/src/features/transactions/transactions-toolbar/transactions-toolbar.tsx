import { ListChecks } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  CategoryResponse,
  TagResponse,
  UncategorizedSuggestionsParams,
} from "@/api/generated/model";
import { ExportMenu } from "@/components/export-menu/export-menu";
import { Button } from "@/components/ui/button/button";
import { SavedFilters } from "@/features/transactions/saved-filters/saved-filters";
import type { TransactionDraft } from "@/features/transactions/transaction-form/transaction-draft";
import { TransactionTemplates } from "@/features/transactions/transaction-templates/transaction-templates";
import { UncategorizedSuggestionsDialog } from "@/features/transactions/uncategorized-suggestions/uncategorized-suggestions-dialog";
import type { TransactionFilters } from "@/features/transactions/use-transaction-filters";
import { useFeature } from "@/hooks/use-settings";

interface Props {
  filters: TransactionFilters;
  filterParams: UncategorizedSuggestionsParams;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
  exportUrl: string;
  exportPdfUrl: string;
  onUseTemplate: (draft: TransactionDraft) => void;
}

export function TransactionsToolbar({
  filters,
  filterParams,
  accounts,
  categories,
  tags,
  exportUrl,
  exportPdfUrl,
  onUseTemplate,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const learnedCategories = useFeature("learnedCategories");
  const [suggesting, setSuggesting] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {learnedCategories && filterParams.uncategorized ? (
        <>
          <Button variant="outline" size="sm" onClick={() => setSuggesting(true)}>
            <ListChecks />
            {t("transactions.uncategorizedSuggestions.open")}
          </Button>
          <UncategorizedSuggestionsDialog
            filter={filterParams}
            categories={categories}
            open={suggesting}
            onOpenChange={setSuggesting}
          />
        </>
      ) : null}
      <SavedFilters filters={filters} accounts={accounts} categories={categories} tags={tags} />
      <TransactionTemplates onUse={onUseTemplate} />
      <ExportMenu csvUrl={exportUrl} pdfUrl={exportPdfUrl} />
    </div>
  );
}
