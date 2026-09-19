export function gainTone(value: number): string | undefined {
  if (value > 0) {
    return "text-income";
  }

  return value < 0 ? "text-expense" : undefined;
}
