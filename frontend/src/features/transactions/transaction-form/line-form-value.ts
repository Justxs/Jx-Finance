import { toCents } from "@/lib/money";
import { isMoney, isPositiveMoney } from "@/lib/validation";

export interface LineFormValue {
  id: string;
  categoryId: string;
  amount: string;
  description: string;
}

export function emptyLine(): LineFormValue {
  return { id: crypto.randomUUID(), categoryId: "", amount: "", description: "" };
}

export interface SplitBalance {
  totalCents: number;
  assignedCents: number;
  remainingCents: number;
}

export function splitBalance(amount: string, lines: LineFormValue[]): SplitBalance | null {
  if (!isPositiveMoney(amount)) {
    return null;
  }

  const totalCents = toCents(amount);
  const assignedCents = lines
    .filter((line) => isMoney(line.amount))
    .reduce((sum, line) => sum + toCents(line.amount), 0);

  return { totalCents, assignedCents, remainingCents: totalCents - assignedCents };
}
