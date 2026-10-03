import { useNavigate, useSearch } from "@tanstack/react-router";
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
import type { TransactionResponse } from "@/api/generated/model";
import { useInlineCategory } from "@/components/category-cell/category-cell";
import { signedAmount } from "@/components/transaction-amount/transaction-amount";
import { ledgerTransactions } from "@/features/transactions/ledger-groups/ledger-rows";
import { useLedgerGroups } from "@/features/transactions/ledger-groups/use-ledger-groups";
import { useSuggestedRuleToast } from "@/features/transactions/suggested-rule-toast/use-suggested-rule-toast";
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
import { useTransactionColumnHeaders } from "@/features/transactions/transactions-table/use-transaction-column-headers";
import {
  type TransactionRowHandlers,
  isSelectableTransaction,
  useTransactionColumns,
} from "@/features/transactions/transactions-table/use-transaction-columns";
import { useTransactionFilters } from "@/features/transactions/use-transaction-filters";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useExportUrl } from "@/hooks/use-export-url";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { usePageClamp } from "@/hooks/use-paged-list";
import { useRetained } from "@/hooks/use-retained";
import { useSettingsSuspense } from "@/hooks/use-settings";
import { byId, nameById } from "@/lib/options";
import { transactionName } from "@/lib/transaction-row";
import { metaLine } from "@/lib/utils";
import { usePreferences } from "@/stores/preferences";
import { useTransactionMutations } from "./use-transaction-mutations";
import { useTransactionSelection } from "./use-transaction-selection";

export function useTransactionsPageModel() {
  const { t } = useTranslation();
  const { defaultPageSize, features } = useSettingsSuspense();
  const pageSize = usePreferences().pageSize ?? defaultPageSize;
  const money = useMoney();
  const formatDate = useIsoDate();

  const view = transactionView(useSearch({ from: "/transactions" }));
  const [shown, stale] = useDeferredParams(view);
  const navigate = useNavigate({ from: "/transactions" });
  const [importOpen, setImportOpen] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[] | null>(null);
  const deletingCount = useRetained(deletingIds?.length);
  const viewKey = JSON.stringify(view);
  const { page: _page, sort: _sort, direction: _direction, ...selectionScope } = view;
  const selection = useTransactionSelection(JSON.stringify(selectionScope));

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
  const rowDialogs = useTransactionRowDialogs({ possibleDuplicates: shown.duplicates === true });
  const inlineCategory = useInlineCategory(suggestedRule.offerAfterSave);

  const accountNames = nameById(accounts);
  const mutations = useTransactionMutations({
    listKey,
    accountNames,
    onBulkApplied: selection.clear,
  });
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
    accountNames,
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

  function rowLabel(row: TransactionResponse) {
    return `${formatDate(row.date)} ${transactionName(row, categoryById, t)}`;
  }

  function goToPage(page: number) {
    selection.clear();
    void navigate({ search: (prev) => ({ ...prev, page }) });
  }

  return {
    features,
    accounts,
    categories,
    tags,
    filters,
    filterParams,
    exportCsvUrl,
    exportPdfUrl,
    stale,
    selection,
    selectableIds,
    selectedItems,
    selectedIds,
    mutations,
    groups,
    formSection,
    rowDialogs,
    remove,
    columnHeaders,
    columns,
    rowHandlers,
    rowLabel,
    paging: { page: shown.page, pages, total, pageSize, goToPage },
    bulkDelete: { ids: deletingIds, count: deletingCount, setIds: setDeletingIds },
    importDialog: { open: importOpen, setOpen: setImportOpen },
  };
}
