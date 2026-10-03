import type {
  Currency,
  FlowType,
  SpreadDirection,
  TransactionLineRequest,
  TransactionRefundOfResponse,
} from "@/api/generated/model";

export interface TransactionDraft {
  accountId?: string;
  categoryId?: string | null;
  type?: FlowType;
  amount?: string;
  currency?: Currency;
  date?: string;
  description?: string | null;
  note?: string | null;
  place?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isSplit?: boolean;
  tagIds?: string[];
  lines?: TransactionLineRequest[] | null;
  refundOf?: TransactionRefundOfResponse | null;
  spreadMonths?: number | null;
  spreadDirection?: SpreadDirection | null;
}

declare module "@tanstack/react-router" {
  interface HistoryState {
    transactionDraft?: TransactionDraft;
  }
}
