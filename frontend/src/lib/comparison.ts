export type ChangeDirection = "up" | "down" | "flat";

export interface Change {
  current: number;
  previous: number;
  amount: number;
  percent: number | null;
  direction: ChangeDirection;
}

export function changeOf(
  current: string | number | null | undefined,
  previous: string | number | null | undefined,
): Change | null {
  if (previous === null || previous === undefined) {
    return null;
  }

  const now = Number(current ?? 0);
  const before = Number(previous);
  if (Number.isNaN(now) || Number.isNaN(before)) {
    return null;
  }

  const amount = now - before;
  const rounded = Math.round(amount * 100) / 100;

  return {
    current: now,
    previous: before,
    amount: rounded,
    percent: before === 0 ? null : amount / Math.abs(before),
    direction: directionOf(rounded),
  };
}

function directionOf(amount: number): ChangeDirection {
  if (amount > 0) {
    return "up";
  }
  return amount < 0 ? "down" : "flat";
}
