import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TrashKind } from "@/api/generated/model";
import { useUndoToast } from "@/hooks/use-undo-toast";
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
  const showUndoToast = useUndoToast();
  const item = items.find((candidate) => candidate.id === target);
  const itemLabel = (item ? labelOf(item) : undefined) ?? undefined;

  function confirm(id: string) {
    if (!undoKind) {
      mutation.mutate({ id });
      return;
    }
    mutation.mutate({ id }, { onSuccess: () => showUndoToast(undoKind, id, itemLabel) });
  }

  return {
    request: (id: string) => setTarget(id),
    pendingId: pendingId(mutation),
    busy: mutation.isPending,
    dialogProps: {
      target,
      itemLabel,
      description: undoKind ? t("confirmDelete.undoable") : undefined,
      onCancel: () => setTarget(null),
      onConfirm: confirm,
    },
  };
}
