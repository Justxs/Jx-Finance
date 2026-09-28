import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import { ExportMenu } from "@/components/export-menu/export-menu";
import { SavedFilters } from "../saved-filters/saved-filters";
import type { TransactionDraft } from "../transaction-form";
import { TransactionTemplates } from "../transaction-templates/transaction-templates";

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
  exportUrl: string;
  exportPdfUrl: string;
  onUseTemplate: (draft: TransactionDraft) => void;
}

export function TransactionsToolbar({
  accounts,
  categories,
  tags,
  exportUrl,
  exportPdfUrl,
  onUseTemplate,
}: Readonly<Props>) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <SavedFilters accounts={accounts} categories={categories} tags={tags} />
      <TransactionTemplates onUse={onUseTemplate} />
      <ExportMenu csvUrl={exportUrl} pdfUrl={exportPdfUrl} />
    </div>
  );
}
