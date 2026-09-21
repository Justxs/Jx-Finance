import type {
  CategoryResponse,
  Currency,
  ImportPreviewRow,
  TransactionResponse,
} from "@/api/generated/model";
import { toCents } from "../../../lib/money.ts";

export interface PreviewRowState extends ImportPreviewRow {
  transferAccountId: string;
  existingTransferId: string;
  selected: boolean;
  categoryId: string;
  categorySuggested: boolean;
  ruleName: string | null;
  tagIds: string[];
}

interface CurrencyNet {
  currency: Currency;
  cents: number;
}

interface SelectionSummary {
  total: number;
  selected: number;
  duplicates: number;
  transfers: number;
  nets: CurrencyNet[];
  allSelected: boolean;
  someSelected: boolean;
  selectableCount: number;
}

function normalize(text: string | null | undefined) {
  return text?.trim().toLocaleLowerCase() ?? "";
}

export function recallCategoryId(
  row: ImportPreviewRow,
  transactions: TransactionResponse[],
  categories: CategoryResponse[],
) {
  const description = normalize(row.description);
  if (!description || row.isDuplicate) {
    return "";
  }
  const match = transactions
    .filter(
      (transaction) =>
        transaction.type === row.type &&
        Boolean(transaction.categoryId) &&
        normalize(transaction.description) === description &&
        categories.some(
          (category) => category.id === transaction.categoryId && category.type === row.type,
        ),
    )
    .toSorted((a, b) => b.date.localeCompare(a.date))[0];
  return match?.categoryId ?? "";
}

export function toPreviewRows(
  rows: ImportPreviewRow[],
  transactions: TransactionResponse[],
  categories: CategoryResponse[],
): PreviewRowState[] {
  return rows.map((row) => {
    const ruleName = row.isDuplicate ? null : row.matchedRuleName;
    const ruleCategoryId = ruleName ? (row.suggestedCategoryId ?? "") : "";
    const categoryId = ruleCategoryId || recallCategoryId(row, transactions, categories);
    return {
      ...row,
      selected: !row.isDuplicate && !row.looksLikeTransfer,
      transferAccountId: "",
      existingTransferId: "",
      categoryId,
      categorySuggested: Boolean(categoryId),
      ruleName,
      tagIds: ruleName ? [...row.suggestedTagIds] : [],
    };
  });
}

function netByCurrency(rows: PreviewRowState[]): CurrencyNet[] {
  const cents = new Map<Currency, number>();
  for (const row of rows) {
    const signed = (row.type === "income" ? 1 : -1) * toCents(row.amount);
    cents.set(row.currency, (cents.get(row.currency) ?? 0) + signed);
  }
  return [...cents].map(([currency, total]) => ({ currency, cents: total }));
}

export function summarizeSelection(rows: PreviewRowState[]): SelectionSummary {
  const selectedRows = rows.filter((row) => row.selected);
  const selectable = rows.filter((row) => !row.isDuplicate);
  return {
    total: rows.length,
    selected: selectedRows.length,
    duplicates: rows.filter((row) => row.isDuplicate).length,
    transfers: rows.filter((row) => row.looksLikeTransfer || Boolean(row.transferAccountId)).length,
    nets: netByCurrency(selectedRows),
    allSelected: selectable.length > 0 && selectable.every((row) => row.selected),
    someSelected: selectedRows.length > 0,
    selectableCount: selectable.length,
  };
}

export function selectAllPatch(rows: PreviewRowState[], checked: boolean): PreviewRowState[] {
  return rows.map((row) => {
    if (!checked) {
      return { ...row, selected: false };
    }
    return row.isDuplicate ? row : { ...row, selected: true };
  });
}

export function applyCategory(
  rows: PreviewRowState[],
  category: CategoryResponse,
): PreviewRowState[] {
  return rows.map((row) =>
    row.selected && row.type === category.type && !row.transferAccountId
      ? { ...row, categoryId: category.id, categorySuggested: false }
      : row,
  );
}

export function categoryTargetCount(rows: PreviewRowState[], category: CategoryResponse) {
  return rows.filter((row) => row.selected && row.type === category.type && !row.transferAccountId)
    .length;
}

export function importDateRange(rows: PreviewRowState[]) {
  const dates = rows.map((row) => row.date).toSorted((a, b) => a.localeCompare(b));
  return { dateFrom: dates[0] ?? "", dateTo: dates.at(-1) ?? "" };
}
