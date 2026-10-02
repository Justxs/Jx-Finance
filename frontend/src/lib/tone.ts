export const INCOME_TONE = "text-income";
export const EXPENSE_TONE = "text-expense";

function directionOf(value: number, sign: "+" | "−" | "auto") {
  if (sign === "auto") {
    return value;
  }
  return sign === "+" ? Math.abs(value) : -Math.abs(value);
}

export function gainTone(value: number, sign: "+" | "−" | "auto" = "auto"): string | undefined {
  const direction = directionOf(value, sign);
  if (direction > 0) {
    return INCOME_TONE;
  }

  return direction < 0 ? EXPENSE_TONE : undefined;
}
