import type { AccountsParams, ConversionsParams, TransfersParams } from "@/api/generated/model";

export const TRANSFERS_PAGE_SIZE = 10;
export const CONVERSIONS_PAGE_SIZE = 10;

export function accountListParams(search: AccountsParams): AccountsParams {
  return {
    search: search.search,
    iban: search.iban,
    type: search.type,
    sort: search.sort,
    direction: search.direction,
  };
}

export function transfersPageParams(page: number): TransfersParams {
  return { page, pageSize: TRANSFERS_PAGE_SIZE };
}

export function conversionsPageParams(page: number): ConversionsParams {
  return { page, pageSize: CONVERSIONS_PAGE_SIZE };
}
