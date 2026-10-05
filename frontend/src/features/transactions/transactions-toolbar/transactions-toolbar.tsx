import { Bookmark, Download, Ellipsis, FileUp, ListChecks, NotebookPen } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  CategoryResponse,
  TagResponse,
  UncategorizedSuggestionsParams,
} from "@/api/generated/model";
import { ExportMenu } from "@/components/export-menu/export-menu";
import { Button } from "@/components/ui/button/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu/menu";
import type { PopoverControl } from "@/components/ui/popover/popover";
import { SavedFilters } from "@/features/transactions/saved-filters/saved-filters";
import { TransactionTemplates } from "@/features/transactions/transaction-templates/transaction-templates";
import { UncategorizedSuggestionsDialog } from "@/features/transactions/uncategorized-suggestions/uncategorized-suggestions-dialog";
import type { TransactionFilters } from "@/features/transactions/use-transaction-filters";
import { useFeature } from "@/hooks/use-settings";
import type { TransactionDraft } from "@/lib/transaction-draft";

interface Props {
  filters: TransactionFilters;
  filterParams: UncategorizedSuggestionsParams;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
  exportUrl: string;
  exportPdfUrl: string;
  onUseTemplate: (draft: TransactionDraft) => void;
  onImport?: () => void;
}

type Panel = "savedFilters" | "templates" | "export";

export function TransactionsToolbar({
  filters,
  filterParams,
  accounts,
  categories,
  tags,
  exportUrl,
  exportPdfUrl,
  onUseTemplate,
  onImport,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const learnedCategories = useFeature("learnedCategories");
  const [suggesting, setSuggesting] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [fromMenu, setFromMenu] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const canSuggest = learnedCategories && filterParams.uncategorized;

  function control(name: Panel): PopoverControl {
    return {
      open: panel === name,
      onOpenChange: (open) => {
        setPanel(open ? name : null);
        if (open) {
          setFromMenu(false);
        }
      },
      anchor: fromMenu ? moreRef : undefined,
    };
  }

  function openFromMenu(name: Panel) {
    setPanel(name);
    setFromMenu(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <div className="contents max-sm:hidden">
        {canSuggest ? (
          <Button variant="outline" size="sm" onClick={() => setSuggesting(true)}>
            <ListChecks />
            {t("transactions.uncategorizedSuggestions.open")}
          </Button>
        ) : null}
        <SavedFilters
          filters={filters}
          accounts={accounts}
          categories={categories}
          tags={tags}
          control={control("savedFilters")}
        />
        <TransactionTemplates onUse={onUseTemplate} control={control("templates")} />
        <ExportMenu csvUrl={exportUrl} pdfUrl={exportPdfUrl} control={control("export")} />
      </div>
      <Menu>
        <MenuTrigger
          ref={moreRef}
          render={<Button type="button" variant="outline" className="sm:hidden" />}
        >
          <Ellipsis />
          {t("transactions.moreActions")}
        </MenuTrigger>
        <MenuContent>
          {canSuggest ? (
            <MenuItem onClick={() => setSuggesting(true)}>
              <ListChecks />
              {t("transactions.uncategorizedSuggestions.open")}
            </MenuItem>
          ) : null}
          <MenuItem onClick={() => openFromMenu("savedFilters")}>
            <Bookmark />
            {t("transactions.savedFilters")}
          </MenuItem>
          <MenuItem onClick={() => openFromMenu("templates")}>
            <NotebookPen />
            {t("transactions.templates")}
          </MenuItem>
          <MenuItem onClick={() => openFromMenu("export")}>
            <Download />
            {t("export.button")}
          </MenuItem>
          {onImport ? (
            <MenuItem disabled={accounts.length === 0} onClick={onImport}>
              <FileUp />
              {t("imports.open")}
            </MenuItem>
          ) : null}
        </MenuContent>
      </Menu>
      {canSuggest ? (
        <UncategorizedSuggestionsDialog
          filter={filterParams}
          categories={categories}
          open={suggesting}
          onOpenChange={setSuggesting}
        />
      ) : null}
    </div>
  );
}
