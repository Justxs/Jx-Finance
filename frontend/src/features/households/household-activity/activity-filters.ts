import type { AuditEntityKind } from "@/api/generated/model";

export const ALL = "all";

export const KINDS = [
  "transaction",
  "transfer",
  "conversion",
  "investmentTransaction",
  "attachment",
  "sharedExpense",
  "settlement",
  "account",
  "category",
  "tag",
  "budget",
  "goal",
  "recurringBill",
  "asset",
  "debt",
  "member",
  "household",
] as const satisfies readonly AuditEntityKind[];

export interface ActivityFilters {
  memberId: string;
  kind: AuditEntityKind | typeof ALL;
  from: string;
  to: string;
}

export const NO_FILTERS: ActivityFilters = { memberId: ALL, kind: ALL, from: "", to: "" };
