export function keptShare(totalIncome: string, net: string) {
  const income = Number(totalIncome);
  if (income <= 0) {
    return null;
  }

  const left = Number(net);
  return left >= 0
    ? { kept: true, share: left / income }
    : { kept: false, share: (income - left) / income };
}
