import { normalizeMoney } from "./validation.ts";

export function toCents(value: string): number {
  return Math.round(Number(normalizeMoney(value)) * 100);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
