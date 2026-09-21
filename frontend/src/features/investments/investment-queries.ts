import type {
  InvestmentTransactionType,
  InvestmentTransactionsParams,
  PortfolioParams,
  TaxSummaryParams,
  ValueHistoryParams,
} from "@/api/generated/model";
import { toIso } from "@/lib/calendar";

export const ACTIVITY_PAGE_SIZE = 15;

export type ValueRange = "threeMonths" | "oneYear" | "fiveYears" | "all";

export const VALUE_RANGES: readonly ValueRange[] = ["threeMonths", "oneYear", "fiveYears", "all"];

const RANGE_MONTHS: Record<Exclude<ValueRange, "all">, number> = {
  threeMonths: 3,
  oneYear: 12,
  fiveYears: 60,
};

const EARLIEST = "1970-01-01";

export function portfolioParams(accountId: string | undefined): PortfolioParams {
  return { accountId };
}

export function valueHistoryParams(
  accountId: string | undefined,
  range: ValueRange,
  today: Date,
): ValueHistoryParams {
  const to = toIso(today);
  if (range === "all") {
    return { accountId, from: EARLIEST, to };
  }

  const start = new Date(
    today.getFullYear(),
    today.getMonth() - RANGE_MONTHS[range],
    today.getDate(),
  );
  return { accountId, from: toIso(start), to };
}

export const TAX_ACCOUNT_SEPARATOR = ",";

export function taxAccountIds(value: string | undefined, known: readonly string[]): string[] {
  const allowed = new Set(known);
  return (value ?? "")
    .split(TAX_ACCOUNT_SEPARATOR)
    .map((id) => id.trim())
    .filter((id, index, ids) => allowed.has(id) && ids.indexOf(id) === index);
}

export function taxSummaryParams(
  year: number | undefined,
  accountIds: readonly string[],
): TaxSummaryParams {
  return {
    year,
    accountIds: accountIds.length === 0 ? undefined : accountIds.join(TAX_ACCOUNT_SEPARATOR),
  };
}

export function taxYearOptions(available: readonly number[], selected: number): number[] {
  return [...new Set([...available, selected])].toSorted((left, right) => right - left);
}

export function activityParams(
  page: number,
  accountId: string | undefined,
  type: InvestmentTransactionType | "",
): InvestmentTransactionsParams {
  return {
    page,
    pageSize: ACTIVITY_PAGE_SIZE,
    accountId,
    type: type || undefined,
  };
}
