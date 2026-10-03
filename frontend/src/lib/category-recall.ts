import type {
  CategoryResponse,
  ImportPreviewRow,
  TransactionResponse,
  TransactionsParams,
} from "@/api/generated/model";

const RECALL_PAGE_SIZE = 200;

export const recallParams: TransactionsParams = {
  page: 1,
  pageSize: RECALL_PAGE_SIZE,
  sort: "date",
  direction: "desc",
};

function normalize(text: string | null | undefined) {
  return text?.trim().toLocaleLowerCase() ?? "";
}

export function recallCategoryId(
  row: Pick<ImportPreviewRow, "description" | "type" | "isDuplicate">,
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
