export const INCOME_TONE = "text-income";
export const EXPENSE_TONE = "text-expense";

export function gainTone(value: number): string | undefined {
  if (value > 0) {
    return INCOME_TONE;
  }

  return value < 0 ? EXPENSE_TONE : undefined;
}
