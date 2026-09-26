import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useRestoreDeleted } from "@/api/generated";
import type { TrashKind } from "@/api/generated/model";
import type { DeleteProps } from "@/components/row-actions/row-actions";
import { pendingId } from "@/lib/mutations";

interface DeleteOptions {
  onSuccess?: () => void;
}

export interface DeleteMutation {
  mutate: (variables: { id: string }, options?: DeleteOptions) => void;
  isPending: boolean;
  variables?: { id: string };
}

export function useConfirmedDelete<T extends { id: string }>(
  mutation: DeleteMutation,
  items: readonly T[],
  labelOf: (item: T) => string | null | undefined,
  undoKind?: TrashKind,
) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<string | null>(null);
  const restore = useRestoreDeleted();
  const item = items.find((candidate) => candidate.id === target);
  const itemLabel = (item ? labelOf(item) : undefined) ?? undefined;

  function showUndoToast(kind: TrashKind, entityId: string) {
    toast.success(itemLabel ? t("trash.deletedNamed", { name: itemLabel }) : t("trash.deleted"), {
      action: {
        label: t("trash.undo"),
        onClick: () =>
          restore.mutate(
            { data: { kind, entityId } },
            { onSuccess: () => toast.success(t("trash.restored")) },
          ),
      },
    });
  }

  function confirm(id: string) {
    if (!undoKind) {
      mutation.mutate({ id });
      return;
    }
    mutation.mutate({ id }, { onSuccess: () => showUndoToast(undoKind, id) });
  }

  const pending = pendingId(mutation);

  return {
    request: (id: string) => setTarget(id),
    pendingId: pending,
    busy: mutation.isPending,
    deleteProps: (id: string): DeleteProps => ({
      onDelete: () => setTarget(id),
      deletePending: pending === id,
      deleteDisabled: mutation.isPending,
    }),
    dialogProps: {
      target,
      itemLabel,
      description: undoKind ? t("confirmDelete.undoable") : undefined,
      onCancel: () => setTarget(null),
      onConfirm: confirm,
    },
  };
}
