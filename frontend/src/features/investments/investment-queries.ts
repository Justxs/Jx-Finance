import type {
  InvestmentTransactionType,
  InvestmentTransactionsParams,
  PortfolioParams,
} from "@/api/generated/model";

export const ACTIVITY_PAGE_SIZE = 15;

export function portfolioParams(accountId: string | undefined): PortfolioParams {
  return { accountId };
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
