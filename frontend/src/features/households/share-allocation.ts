import type { SplitMethod } from "@/api/generated/model";
import { toCents } from "@/lib/money";
import { isNonNegativeMoney } from "@/lib/validation";

export interface SharePart {
  weight?: number | null;
  amount?: string | null;
}

function byWeight(totalCents: number, weights: readonly number[]): number[] | null {
  const sum = weights.reduce((total, weight) => total + weight, 0);
  if (sum <= 0 || weights.some((weight) => !Number.isInteger(weight) || weight < 0)) {
    return null;
  }

  const parts = weights.map((weight, index) => {
    const floor = Math.floor((totalCents * weight) / sum);
    return { index, floor, remainder: totalCents * weight - floor * sum };
  });
  const left = totalCents - parts.reduce((total, part) => total + part.floor, 0);
  const bonus = new Set(
    parts
      .toSorted((a, b) => b.remainder - a.remainder || a.index - b.index)
      .slice(0, left)
      .map((part) => part.index),
  );

  return parts.map((part) => part.floor + (bonus.has(part.index) ? 1 : 0));
}

function exactly(totalCents: number, parts: readonly SharePart[]): number[] | null {
  if (parts.some((part) => !isNonNegativeMoney(part.amount ?? ""))) {
    return null;
  }

  const cents = parts.map((part) => toCents(part.amount ?? ""));
  return cents.reduce((total, amount) => total + amount, 0) === totalCents ? cents : null;
}

export function allocateShares(
  total: string,
  method: SplitMethod,
  parts: readonly SharePart[],
): number[] | null {
  const totalCents = toCents(total);
  if (method === "equal") {
    return byWeight(
      totalCents,
      parts.map(() => 1),
    );
  }
  if (method === "shares") {
    return byWeight(
      totalCents,
      parts.map((part) => part.weight ?? 0),
    );
  }
  return exactly(totalCents, parts);
}
