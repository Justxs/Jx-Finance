export function isMoney(value: string): boolean {
  return /^-?\d+(\.\d{1,2})?$/.test(value.trim());
}

export function isPositiveMoney(value: string): boolean {
  return isMoney(value) && Number(value) > 0;
}

export function isIban(value: string): boolean {
  const compact = value.replaceAll(" ", "").toUpperCase();
  return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(compact);
}
