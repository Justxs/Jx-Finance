export function normalizeMoney(value: string): string {
  return value.trim().replace(",", ".");
}

export function isMoney(value: string): boolean {
  return /^-?\d+(\.\d{1,2})?$/.test(normalizeMoney(value));
}

export function isPositiveMoney(value: string): boolean {
  return isMoney(value) && Number(normalizeMoney(value)) > 0;
}

export function isRate(value: string): boolean {
  return value.trim() === "" || /^\d+(\.\d+)?$/.test(normalizeMoney(value));
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+$/.test(value);
}

export function isIban(value: string): boolean {
  const compact = value.replaceAll(" ", "").toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z\d]{11,30}$/.test(compact);
}
