import type { AccountsParams } from "@/api/generated/model";

export const MOVEMENTS_PAGE_SIZE = 10;

export function accountListParams(search: AccountsParams): AccountsParams {
  return {
    search: search.search,
    iban: search.iban,
    type: search.type,
    sort: search.sort,
    direction: search.direction,
  };
}

export function movementsPageParams(page: number) {
  return { page, pageSize: MOVEMENTS_PAGE_SIZE };
}
