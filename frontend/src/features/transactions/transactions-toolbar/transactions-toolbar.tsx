import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import { ExportMenu } from "@/components/export-menu/export-menu";
import { Button } from "@/components/ui/button/button";
import { SavedFilters } from "../saved-filters/saved-filters";
import type { TransactionDraft } from "../transaction-form";
import { TransactionTemplates } from "../transaction-templates/transaction-templates";

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
  exportUrl: string;
  exportPdfUrl: string;
  filtered: boolean;
  onClearFilters: () => void;
  onUseTemplate: (draft: TransactionDraft) => void;
}

export function TransactionsToolbar({
  accounts,
  categories,
  tags,
  exportUrl,
  exportPdfUrl,
  filtered,
  onClearFilters,
  onUseTemplate,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-1">
      {filtered ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClearFilters}>
          {t("transactions.clearFilters")}
        </Button>
      ) : null}
      <SavedFilters accounts={accounts} categories={categories} tags={tags} />
      <TransactionTemplates onUse={onUseTemplate} />
      <ExportMenu csvUrl={exportUrl} pdfUrl={exportPdfUrl} />
    </div>
  );
}
