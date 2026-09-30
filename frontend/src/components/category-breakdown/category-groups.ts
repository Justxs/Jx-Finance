import type { CategoryBreakdownItem } from "@/api/generated/model";

function sum(a: string | null | undefined, b: string | null | undefined) {
  if (a == null && b == null) {
    return null;
  }
  return (Number(a ?? 0) + Number(b ?? 0)).toFixed(2);
}

export function rollUpToGroups(items: readonly CategoryBreakdownItem[]): CategoryBreakdownItem[] {
  const groups = new Map<string, CategoryBreakdownItem>();

  for (const item of items) {
    const key = item.parentId ?? item.categoryId ?? item.syntheticGroup ?? "uncategorized";
    const existing = groups.get(key);
    const own: CategoryBreakdownItem = item.parentId
      ? {
          ...item,
          categoryId: item.parentId,
          categoryName: item.parentName ?? item.categoryName,
          categoryIcon: item.parentIcon ?? null,
          parentId: null,
          parentName: null,
          parentIcon: null,
        }
      : item;

    if (existing) {
      groups.set(key, {
        ...(item.parentId ? existing : own),
        amount: sum(existing.amount, item.amount) ?? "0.00",
        comparisonAmount: sum(existing.comparisonAmount, item.comparisonAmount),
      });
    } else {
      groups.set(key, own);
    }
  }

  return [...groups.values()];
}
