import type { QueryClient } from "@tanstack/react-query";
import { getTransactionsSuspenseQueryOptions, suggestCategory } from "@/api/generated";
import type { CategoryResponse, FeatureFlags } from "@/api/generated/model";
import { recallCategoryId } from "@/features/imports/import-preview-table/preview-rows";
import { recallParams } from "@/features/imports/import-queries";
import { silentQuery } from "@/lib/query-client";
import { type QuickAddDraft, chooseQuickAddCategory } from "./quick-add";

const RECALL_STALE_MS = 5 * 60 * 1000;

function suggestionFor(draft: QuickAddDraft, features: FeatureFlags) {
  if (!features.categorizationRules && !features.learnedCategories) {
    return Promise.resolve(null);
  }
  return suggestCategory({
    accountId: draft.accountId,
    type: "expense",
    amount: draft.amount,
    description: draft.description,
  }).catch(() => null);
}

async function recalledFor(
  queryClient: QueryClient,
  draft: QuickAddDraft,
  categories: CategoryResponse[],
) {
  try {
    const history = await queryClient.query({
      ...getTransactionsSuspenseQueryOptions(recallParams),
      ...silentQuery,
      staleTime: RECALL_STALE_MS,
    });
    return recallCategoryId(
      { description: draft.description, type: "expense", isDuplicate: false },
      history.items,
      categories,
    );
  } catch {
    return "";
  }
}

export async function quickAddCategoryId(
  queryClient: QueryClient,
  draft: QuickAddDraft,
  categories: CategoryResponse[],
  features: FeatureFlags,
) {
  const [suggestion, recalled] = await Promise.all([
    suggestionFor(draft, features),
    recalledFor(queryClient, draft, categories),
  ]);
  return chooseQuickAddCategory(suggestion, recalled);
}
