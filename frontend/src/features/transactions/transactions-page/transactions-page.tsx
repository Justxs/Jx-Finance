import { useNavigate, useSearch } from "@tanstack/react-router";
import { FileUp, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getExportTransactionsPdfUrl,
  getExportTransactionsUrl,
  getLedgerQueryKey,
  useAccountsSuspense,
  useCategoriesSuspense,
  useLedgerSuspense,
  useTagsSuspense,
} from "@/api/generated";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { PageHeader } from "@/components/page-header/page-header";
import { Pagination } from "@/components/pagination/pagination";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Section } from "@/components/ui/section/section";
import { TextLink } from "@/components/ui/text-link/text-link";
import { useSuggestedRuleToast } from "@/features/categorization-rules/suggested-rule-toast/use-suggested-rule-toast";
import { ImportDialog } from "@/features/imports/import-dialog/import-dialog";
import { ActiveFilters } from "@/features/transactions/active-filters/active-filters";
import { ledgerTransactions } from "@/features/transactions/ledger-groups/ledger-rows";
import { useLedgerGroups } from "@/features/transactions/ledger-groups/use-ledger-groups";
import { SelectionToolbar } from "@/features/transactions/selection-toolbar/selection-toolbar";
import { signedAmount } from "@/features/transactions/transaction-amount/transaction-amount";
import { transactionName } from "@/features/transactions/transaction-amount/transaction-row";
import { useTransactionFormSection } from "@/features/transactions/transaction-form-section/transaction-form-section";
import {
  duplicateDraft,
  refundDraft,
} from "@/features/transactions/transaction-form/transaction-draft";
import {
  transactionFilterParams,
  transactionListParams,
  transactionView,
} from "@/features/transactions/transaction-queries";
import { useTransactionRowDialogs } from "@/features/transactions/transaction-row-actions/transaction-row-actions";
import { TransactionsFiltersDialog } from "@/features/transactions/transactions-filters-dialog/transactions-filters-dialog";
import { TransactionsList } from "@/features/transactions/transactions-list/transactions-list";
import { useInlineCategory } from "@/features/transactions/transactions-table/category-cell";
import { TransactionsTable } from "@/features/transactions/transactions-table/transactions-table";
import { useTransactionColumnHeaders } from "@/features/transactions/transactions-table/use-transaction-column-headers";
import {
  type TransactionRowHandlers,
  isSelectableTransaction,
  useTransactionColumns,
} from "@/features/transactions/transactions-table/use-transaction-columns";
import { TransactionsToolbar } from "@/features/transactions/transactions-toolbar/transactions-toolbar";
import { TransactionsTotals } from "@/features/transactions/transactions-totals/transactions-totals";
import { useTransactionFilters } from "@/features/transactions/use-transaction-filters";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useExportUrl } from "@/hooks/use-export-url";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { usePageClamp } from "@/hooks/use-paged-list";
import { useSettingsSuspense } from "@/hooks/use-settings";
import { byId, nameById } from "@/lib/options";
import { metaLine } from "@/lib/utils";
import { usePreferences } from "@/stores/preferences";
import { useTransactionMutations } from "./use-transaction-mutations";
import { useTransactionSelection } from "./use-transaction-selection";

export function TransactionsPage() {
  const { t } = useTranslation();
  const { defaultPageSize, features } = useSettingsSuspense();
  const pageSize = usePreferences().pageSize ?? defaultPageSize;
  const money = useMoney();
  const formatDate = useIsoDate();

  const view = transactionView(useSearch({ from: "/transactions" }));
  const [shown, stale] = useDeferredParams(view);
  const navigate = useNavigate({ from: "/transactions" });
  const [importOpen, setImportOpen] = useState(false);
  const viewKey = JSON.stringify(view);
  const selection = useTransactionSelection(viewKey);

  const listParams = transactionListParams(shown, pageSize);
  const filterParams = transactionFilterParams(shown);
  const listKey = getLedgerQueryKey(listParams);
  const exportCsvUrl = useExportUrl(getExportTransactionsUrl(listParams));
  const exportPdfUrl = useExportUrl(getExportTransactionsPdfUrl(listParams));

  const { data: accounts } = useAccountsSuspense();
  const { data: categories } = useCategoriesSuspense();
  const { data: tags } = useTagsSuspense();
  const {
    data: { items: ledgerItems, total },
  } = useLedgerSuspense(listParams);
  const items = ledgerTransactions(ledgerItems);
  const suggestedRule = useSuggestedRuleToast(categories);
  const filters = useTransactionFilters({ accounts, categories });
  const columnHeaders = useTransactionColumnHeaders(filters, tags);
  const rowDialogs = useTransactionRowDialogs();
  const inlineCategory = useInlineCategory(suggestedRule.offerAfterSave);

  const mutations = useTransactionMutations({ listKey, onBulkApplied: selection.clear });
  const groups = useLedgerGroups({
    viewKey,
    items: ledgerItems,
    filter: filterParams,
    onGrouped: selection.clear,
  });
  const formSection = useTransactionFormSection({
    accounts,
    categories,
    tags,
    mutations,
    onCategorized: suggestedRule.offerAfterSave,
  });

  const categoryById = byId(categories);
  const selectableIds = items.filter(isSelectableTransaction).map((item) => item.id);
  const selectedItems = items.filter((item) => selection.selectedIds.has(item.id));
  const selectedIds = selectedItems.map((item) => item.id);
  const remove = useConfirmedDelete(
    mutations.remove,
    [...items, ...groups.memberTransactions],
    (item) =>
      metaLine(
        formatDate(item.date),
        transactionName(item, categoryById, t),
        signedAmount(money, item),
      ),
    "transaction",
  );

  const pages = usePageClamp(
    {
      page: shown.page,
      setPage: (page) => void navigate({ search: (prev) => ({ ...prev, page }), replace: true }),
    },
    total,
    pageSize,
  );

  const rowHandlers: TransactionRowHandlers = {
    accountNames: nameById(accounts),
    categoryById,
    tagById: byId(tags),
    onEdit: (transaction) => formSection.startEditing(transaction),
    onDuplicate: (transaction) => formSection.startFromDraft(duplicateDraft(transaction)),
    onRefund: (transaction) => formSection.startFromDraft(refundDraft(transaction)),
    onDelete: remove.request,
    deletingId: remove.pendingId,
    moreActions: rowDialogs.moreActions,
    onUpdateSplit: rowDialogs.onUpdateSplit,
  };
  const columns = useTransactionColumns({ ...rowHandlers, categories, inlineCategory });

  return (
    <div className="space-y-6">
      <PageHeader title={t("transactions.title")}>
        <TransactionsToolbar
          filters={filters}
          filterParams={filterParams}
          accounts={accounts}
          categories={categories}
          tags={tags}
          onUseTemplate={formSection.startFromDraft}
          exportUrl={exportCsvUrl}
          exportPdfUrl={exportPdfUrl}
        />
        {features.import ? (
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            disabled={accounts.length === 0}
          >
            <FileUp />
            {t("imports.open")}
          </Button>
        ) : null}
        <Button onClick={formSection.startBlank} disabled={accounts.length === 0}>
          <Plus />
          {t("transactions.add")}
        </Button>
      </PageHeader>

      {accounts.length === 0 ? (
        <EmptyText
          size="sm"
          action={
            <TextLink to="/accounts" search={{ new: "account" }}>
              {t("accounts.add")}
            </TextLink>
          }
        >
          {t("transactions.needAccount")}
        </EmptyText>
      ) : null}

      <Section className="space-y-2">
        <ActiveFilters filters={filters} tags={tags} />
        {selectedItems.length > 0 ? (
          <SelectionToolbar
            selected={selectedItems}
            categories={categories}
            tags={tags}
            pending={mutations.bulkCategory.isPending}
            tagPending={mutations.bulkTag.isPending}
            onApply={(categoryId) =>
              mutations.bulkCategory.mutate({ data: { transactionIds: selectedIds, categoryId } })
            }
            onApplyTags={(tagIds) =>
              mutations.bulkTag.mutate({ data: { transactionIds: selectedIds, tagIds } })
            }
            onGroup={() =>
              groups.openGroupDialog({ kind: "selection", transactionIds: selectedIds })
            }
            onClear={selection.clear}
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <TransactionsTotals params={filterParams} stale={stale} />
            <TransactionsFiltersDialog filters={filters} tags={tags} className="md:hidden" />
          </div>
        )}

        <div className="hidden md:block">
          <TransactionsTable
            rows={groups.rows}
            groups={groups.handlers}
            columns={columns}
            isPlaceholder={stale}
            columnFilters={columnHeaders.byColumn}
            columnAriaSort={columnHeaders.ariaSortByColumn}
            filtered={columnHeaders.active}
            onClearFilters={columnHeaders.clearAll}
            selection={{
              selectedIds: selection.selectedIds,
              selectableIds,
              rowLabel: (row) => `${formatDate(row.date)} ${transactionName(row, categoryById, t)}`,
              onToggle: selection.toggle,
              onTogglePage: (selected) => selection.togglePage(selectableIds, selected),
            }}
          />
        </div>
        <div className="md:hidden">
          <TransactionsList
            rows={groups.rows}
            groups={groups.handlers}
            isPlaceholder={stale}
            filtered={columnHeaders.active}
            onClearFilters={columnHeaders.clearAll}
            {...rowHandlers}
          />
        </div>

        <Pagination
          page={shown.page}
          pages={pages}
          range={{ total, pageSize }}
          onPageChange={(page) => navigate({ search: (prev) => ({ ...prev, page }) })}
        />
      </Section>

      {formSection.dialogs}
      {rowDialogs.dialogs}
      {groups.dialogs}
      <ConfirmDeleteDialog {...remove.dialogProps} />
      {features.import ? (
        <ImportDialog open={importOpen} onOpenChange={setImportOpen} accounts={accounts} />
      ) : null}
    </div>
  );
}
