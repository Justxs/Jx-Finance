import type { ReceiptItemResponse, ReceiptResultResponse } from "@/api/generated/model";
import { fromCents, toCents } from "@/lib/money";
import { isPositiveMoney } from "@/lib/validation";
import type { LineFormValue } from "../transaction-form/line-form-value";

export const LINE_DESCRIPTION_MAX_LENGTH = 500;

export type CategoryChoice = string | null;

export interface ReceiptGroup {
  categoryId: CategoryChoice;
  items: number[];
  weightCents: number;
}

export interface ReceiptTotals {
  itemsCents: number;
  printedCents: number | null;
  amountCents: number | null;
}

export type ReceiptFill = { categoryId: string } | { lines: LineFormValue[] };

export function itemWeight(item: ReceiptItemResponse): number {
  return Math.max(0, toCents(item.amount) - toCents(item.discount) + toCents(item.deposit));
}

export function groupItems(
  items: readonly ReceiptItemResponse[],
  choices: readonly CategoryChoice[],
): ReceiptGroup[] {
  const groups = new Map<CategoryChoice, ReceiptGroup>();
  for (const [index, item] of items.entries()) {
    const categoryId = choices[index] ?? null;
    const group = groups.get(categoryId) ?? { categoryId, items: [], weightCents: 0 };
    group.items.push(index);
    group.weightCents += itemWeight(item);
    groups.set(categoryId, group);
  }
  return [...groups.values()];
}

export function shareByWeight(totalCents: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((total, weight) => total + weight, 0);
  if (sum === 0) {
    return weights.map((_, index) => (index === 0 ? totalCents : 0));
  }

  const shares = weights.map((weight) => Math.floor((totalCents * weight) / sum));
  const left = totalCents - shares.reduce((total, share) => total + share, 0);
  const rounded = new Set(
    weights
      .map((weight, index) => ({ index, weight, remainder: (totalCents * weight) % sum }))
      .toSorted((a, b) => b.remainder - a.remainder || b.weight - a.weight || a.index - b.index)
      .slice(0, left)
      .map(({ index }) => index),
  );
  return shares.map((share, index) => share + (rounded.has(index) ? 1 : 0));
}

export function receiptTotals(result: ReceiptResultResponse, amount: string): ReceiptTotals {
  const items = result.items.reduce((total, item) => total + itemWeight(item), 0);
  const adjustments = result.adjustments.reduce(
    (total, adjustment) => total + toCents(adjustment.amount),
    0,
  );
  return {
    itemsCents: items + adjustments,
    printedCents: result.total === null ? null : toCents(result.total),
    amountCents: isPositiveMoney(amount) ? toCents(amount) : null,
  };
}

export function shortName(name: string): string {
  return (name.split(/["„“”«»\d]/)[0] ?? "").trim() || name.trim();
}

function describe(items: readonly ReceiptItemResponse[], indexes: readonly number[]): string {
  return indexes
    .flatMap((index) => {
      const item = items[index];
      return item ? [shortName(item.name)] : [];
    })
    .join(", ")
    .slice(0, LINE_DESCRIPTION_MAX_LENGTH);
}

export function linesFromReceipt(
  result: ReceiptResultResponse,
  choices: readonly CategoryChoice[],
  amount: string,
): ReceiptFill {
  const totals = receiptTotals(result, amount);
  const totalCents = totals.amountCents ?? totals.printedCents ?? totals.itemsCents;
  const groups = groupItems(result.items, choices);
  const shares = shareByWeight(
    totalCents,
    groups.map((group) => group.weightCents),
  );
  const kept = groups
    .map((group, index) => ({ group, cents: shares[index] ?? 0 }))
    .filter(({ cents }) => cents > 0);

  if (kept.length <= 1) {
    return { categoryId: kept[0]?.group.categoryId ?? groups[0]?.categoryId ?? "" };
  }

  return {
    lines: kept.map(({ group, cents }, index) => ({
      id: `receipt-${index}`,
      categoryId: group.categoryId ?? "",
      amount: fromCents(cents),
      description: describe(result.items, group.items),
    })),
  };
}
