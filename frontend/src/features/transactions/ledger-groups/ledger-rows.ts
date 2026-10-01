import type {
  GroupMembersResponse,
  LedgerItemResponse,
  TransactionGroupSummary,
  TransactionResponse,
} from "@/api/generated/model";

export interface MembersState {
  status: "pending" | "error" | "success";
  data?: GroupMembersResponse;
  retry: () => void;
}

export type LedgerRow =
  | { kind: "transaction"; transaction: TransactionResponse; member: boolean }
  | { kind: "group"; group: TransactionGroupSummary; expanded: boolean }
  | { kind: "membersPending"; group: TransactionGroupSummary }
  | { kind: "membersFailed"; group: TransactionGroupSummary; retry: () => void }
  | { kind: "membersTruncated"; group: TransactionGroupSummary };

export function transactionRow(transaction: TransactionResponse): LedgerRow {
  return { kind: "transaction", transaction, member: false };
}

export function ledgerTransactions(items: readonly LedgerItemResponse[]): TransactionResponse[] {
  return items.flatMap((item) => (item.transaction ? [item.transaction] : []));
}

export function ledgerGroups(items: readonly LedgerItemResponse[]): TransactionGroupSummary[] {
  return items.flatMap((item) => (item.group ? [item.group] : []));
}

function memberRows(
  group: TransactionGroupSummary,
  members: MembersState | undefined,
): LedgerRow[] {
  if (!members || members.status === "pending") {
    return [{ kind: "membersPending", group }];
  }
  if (members.status === "error" || !members.data) {
    return [{ kind: "membersFailed", group, retry: members.retry }];
  }
  const rows: LedgerRow[] = members.data.items.map((transaction) => ({
    kind: "transaction",
    transaction,
    member: true,
  }));
  return members.data.truncated ? [...rows, { kind: "membersTruncated", group }] : rows;
}

export function ledgerRows(
  items: readonly LedgerItemResponse[],
  expandedIds: ReadonlySet<string>,
  membersOf: (groupId: string) => MembersState | undefined,
): LedgerRow[] {
  return items.flatMap((item): LedgerRow[] => {
    if (item.transaction) {
      return [transactionRow(item.transaction)];
    }
    if (!item.group) {
      return [];
    }
    const expanded = expandedIds.has(item.group.id);
    const row: LedgerRow = { kind: "group", group: item.group, expanded };
    return expanded ? [row, ...memberRows(item.group, membersOf(item.group.id))] : [row];
  });
}

export function ledgerRowKey(row: LedgerRow): string {
  return row.kind === "transaction" ? row.transaction.id : `${row.kind}-${row.group.id}`;
}
