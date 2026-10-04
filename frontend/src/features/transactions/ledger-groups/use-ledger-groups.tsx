import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Pencil, Ungroup } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getTransactionGroupMembersQueryKey,
  getTransactionGroupMembersSuspenseQueryOptions,
  useUngroupTransactionGroup,
} from "@/api/generated";
import type {
  GroupMembersResponse,
  LedgerItemResponse,
  TransactionGroupMembersParams,
  TransactionGroupSummary,
} from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import type { RowAction } from "@/components/row-actions/row-actions";
import { useGroupDialog } from "@/features/transactions/group-dialog/group-dialog";
import { type DeleteMutation, useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { silentQuery } from "@/lib/query-client";
import { type LedgerRow, type MembersState, ledgerGroups, ledgerRows } from "./ledger-rows";

const NO_GROUPS: ReadonlySet<string> = new Set();

interface Expansion {
  viewKey: string;
  ids: ReadonlySet<string>;
}

interface Options {
  viewKey: string;
  items: readonly LedgerItemResponse[];
  filter: TransactionGroupMembersParams;
  onGrouped?: () => void;
}

export interface LedgerGroupHandlers {
  onToggle: (groupId: string) => void;
  actions: (group: TransactionGroupSummary) => RowAction[];
  pendingId: string | null;
  focusRef: (transactionId: string) => ((element: HTMLElement | null) => void) | undefined;
}

export function useLedgerGroups({ viewKey, items, filter, onGrouped }: Readonly<Options>) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [expansion, setExpansion] = useState<Expansion>({ viewKey, ids: NO_GROUPS });
  const [focusId, setFocusId] = useState<string | null>(null);
  const expandedIds = expansion.viewKey === viewKey ? expansion.ids : NO_GROUPS;
  const groups = ledgerGroups(items);
  const expanded = groups.filter((group) => expandedIds.has(group.id));
  const groupDialog = useGroupDialog(onGrouped);

  const members = useQueries({
    queries: expanded.map((group) => ({
      ...getTransactionGroupMembersSuspenseQueryOptions(group.id, filter),
      ...silentQuery,
    })),
  });
  const membersById = new Map<string, MembersState>(
    expanded.map((group, index) => {
      const query = members[index];
      return [
        group.id,
        {
          status: query?.status ?? "pending",
          data: query?.data,
          retry: () => void query?.refetch(),
        },
      ];
    }),
  );

  function cachedMembers(groupId: string) {
    return client.getQueryData<GroupMembersResponse>(
      getTransactionGroupMembersQueryKey(groupId, filter),
    )?.items;
  }

  const ungroup = useUngroupTransactionGroup();
  const ungroupMutation: DeleteMutation = {
    mutate: (variables, options) => {
      const firstMember = cachedMembers(variables.id)?.[0]?.id;
      ungroup.mutate(variables, {
        onSuccess: () => {
          options?.onSuccess?.();
          setFocusId(firstMember ?? null);
        },
      });
    },
    isPending: ungroup.isPending,
    variables: ungroup.variables,
  };
  const ungroupDelete = useConfirmedDelete(
    ungroupMutation,
    groups,
    (group) => group.name,
    "transactionGroup",
  );

  function toggle(groupId: string) {
    const next = new Set(expandedIds);
    if (next.has(groupId)) {
      next.delete(groupId);
    } else {
      next.add(groupId);
    }
    setExpansion({ viewKey, ids: next });
  }

  function requestUngroup(groupId: string) {
    client
      .query(getTransactionGroupMembersSuspenseQueryOptions(groupId, filter))
      .catch(() => undefined);
    ungroupDelete.request(groupId);
  }

  function actions(group: TransactionGroupSummary): RowAction[] {
    const rename: RowAction = {
      icon: Pencil,
      label: t("transactions.groups.rename"),
      onSelect: () => groupDialog.open({ kind: "rename", group }),
    };
    if (!group.isMine) {
      return [rename];
    }
    return [
      rename,
      {
        icon: Ungroup,
        label: t("transactions.groups.ungroup"),
        destructive: true,
        disabled: ungroup.isPending,
        pending: ungroupDelete.pendingId === group.id,
        onSelect: () => requestUngroup(group.id),
      },
    ];
  }

  function focusRef(transactionId: string) {
    if (transactionId !== focusId) {
      return undefined;
    }
    return (element: HTMLElement | null) => {
      if (element) {
        element.focus();
        setFocusId(null);
      }
    };
  }

  const rows: LedgerRow[] = ledgerRows(items, expandedIds, (groupId) => membersById.get(groupId));
  const handlers: LedgerGroupHandlers = {
    onToggle: toggle,
    actions,
    pendingId: ungroupDelete.pendingId,
    focusRef,
  };

  return {
    rows,
    handlers,
    memberTransactions: [...membersById.values()].flatMap((state) => state.data?.items ?? []),
    openGroupDialog: groupDialog.open,
    dialogs: (
      <>
        {groupDialog.dialog}
        <ConfirmDeleteDialog
          {...ungroupDelete.dialogProps}
          title={t("transactions.groups.ungroup")}
          confirmLabel={t("transactions.groups.ungroup")}
          description={t("transactions.groups.ungroupHint")}
        />
      </>
    ),
  };
}
