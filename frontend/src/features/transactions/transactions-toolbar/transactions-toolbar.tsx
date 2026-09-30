import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import { ExportMenu } from "@/components/export-menu/export-menu";
import { SavedFilters } from "@/features/transactions/saved-filters/saved-filters";
import type { TransactionDraft } from "@/features/transactions/transaction-form/transaction-draft";
import { TransactionTemplates } from "@/features/transactions/transaction-templates/transaction-templates";
import type { TransactionFilters } from "@/features/transactions/use-transaction-filters";

interface Props {
  filters: TransactionFilters;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
  exportUrl: string;
  exportPdfUrl: string;
  onUseTemplate: (draft: TransactionDraft) => void;
}

export function TransactionsToolbar({
  filters,
  accounts,
  categories,
  tags,
  exportUrl,
  exportPdfUrl,
  onUseTemplate,
}: Readonly<Props>) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <SavedFilters filters={filters} accounts={accounts} categories={categories} tags={tags} />
      <TransactionTemplates onUse={onUseTemplate} />
      <ExportMenu csvUrl={exportUrl} pdfUrl={exportPdfUrl} />
    </div>
  );
}
