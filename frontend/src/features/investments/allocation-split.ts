export interface AllocationBucket {
  id: string;
  value: number;
  target: number;
}

function cents(value: number) {
  return Math.max(0, Math.round(value * 100));
}

export function allocationDrift<T extends AllocationBucket>(buckets: readonly T[]) {
  const total = buckets.reduce((sum, bucket) => sum + cents(bucket.value), 0);

  return buckets.map((bucket) => {
    const share = total > 0 ? cents(bucket.value) / total : 0;
    const targetShare = bucket.target / 100;
    return { ...bucket, share, targetShare, drift: share - targetShare };
  });
}

function fillLevel(funded: readonly { value: number; weight: number }[], amount: number) {
  let value = 0;
  let weight = 0;
  let level = 0;
  for (const [index, bucket] of funded.entries()) {
    value += bucket.value;
    weight += bucket.weight;
    level = (amount + value) / weight;
    const next = funded[index + 1];
    if (!next || level <= next.value / next.weight) {
      return { level, count: index + 1 };
    }
  }

  return { level, count: funded.length };
}

export function splitContribution(
  buckets: readonly AllocationBucket[],
  amountCents: number,
): Map<string, number> {
  const split = new Map<string, number>();
  const candidates = buckets
    .map((bucket, index) => ({
      id: bucket.id,
      index,
      value: cents(bucket.value),
      weight: bucket.target,
    }))
    .filter((bucket) => bucket.weight > 0)
    .toSorted((a, b) => a.value / a.weight - b.value / b.weight || a.index - b.index);
  if (amountCents <= 0 || !Number.isInteger(amountCents) || candidates.length === 0) {
    return split;
  }

  const { level, count } = fillLevel(candidates, amountCents);
  const parts = candidates.slice(0, count).map((bucket) => {
    const exact = Math.max(0, bucket.weight * level - bucket.value);
    const floor = Math.floor(exact);
    return { ...bucket, floor, remainder: exact - floor };
  });
  const left = amountCents - parts.reduce((sum, part) => sum + part.floor, 0);
  const bonus = new Set(
    parts
      .toSorted((a, b) => b.remainder - a.remainder || a.index - b.index)
      .slice(0, left)
      .map((part) => part.id),
  );
  for (const part of parts) {
    const amount = part.floor + (bonus.has(part.id) ? 1 : 0);
    if (amount > 0) {
      split.set(part.id, amount);
    }
  }

  return split;
}
