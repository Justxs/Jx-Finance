export function shareOf(amounts: readonly number[], format: (fraction: number) => string) {
  const max = Math.max(0, ...amounts.map((amount) => Math.abs(amount)));
  const total = amounts.reduce((sum, amount) => sum + Math.max(0, amount), 0);

  return {
    max,
    share: (amount: number) => (amount > 0 ? format(amount / total) : null),
  };
}
