import type { InvestmentTransactionType } from "@/api/generated/model";
import { isNonNegativeMoney, isQuantity, normalizeMoney } from "@/lib/validation";

export interface CashEffectInput {
  type: InvestmentTransactionType;
  quantity: string;
  price: string;
  fee: string;
  amount: string;
}

const UNIT_DIGITS = 8;
const CENT_DIGITS = 2;
const UNITS_PER_CENT = 10n ** BigInt(UNIT_DIGITS * 2 - CENT_DIGITS);

function toScaled(value: string, digits: number): bigint {
  const [whole, fraction = ""] = normalizeMoney(value).split(".");
  return BigInt(whole + fraction.padEnd(digits, "0"));
}

function parseUnits(value: string): bigint | null {
  return isQuantity(value) ? toScaled(value, UNIT_DIGITS) : null;
}

function parseCents(value: string): bigint | null {
  return isNonNegativeMoney(value) ? toScaled(value, CENT_DIGITS) : null;
}

function roundToCents(product: bigint): bigint {
  const magnitude = product < 0n ? -product : product;
  const cents = (magnitude * 2n + UNITS_PER_CENT) / (UNITS_PER_CENT * 2n);
  return product < 0n ? -cents : cents;
}

function formatCents(cents: bigint): string {
  const digits = (cents < 0n ? -cents : cents).toString().padStart(CENT_DIGITS + 1, "0");
  const sign = cents < 0n ? "-" : "";
  return `${sign}${digits.slice(0, -CENT_DIGITS)}.${digits.slice(-CENT_DIGITS)}`;
}

export function cashEffect({ type, quantity, price, fee, amount }: CashEffectInput): string | null {
  if (type === "split") {
    return formatCents(0n);
  }

  if (type === "buy" || type === "sell") {
    const shares = parseUnits(quantity);
    const unitPrice = parseUnits(price);
    const cost = fee.trim() === "" ? 0n : parseCents(fee);
    if (shares === null || unitPrice === null || cost === null) {
      return null;
    }

    const gross = shares * unitPrice;
    const charge = cost * UNITS_PER_CENT;
    return formatCents(roundToCents(type === "buy" ? -(gross + charge) : gross - charge));
  }

  const cash = parseCents(amount);
  if (cash === null) {
    return null;
  }

  return formatCents(type === "dividend" || type === "interest" ? cash : -cash);
}
