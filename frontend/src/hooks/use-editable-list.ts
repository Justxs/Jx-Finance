import { useDeferredValue, useState } from "react";
import type { TrashKind } from "@/api/generated/model";
import { type DeleteMutation, useConfirmedDelete } from "@/hooks/use-confirmed-delete";

export function useEditableList<T extends { id: string }>(
  items: readonly T[],
  deleteMutation: DeleteMutation,
  labelOf: (item: T) => string | null | undefined,
  undoKind?: TrashKind,
) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const list = useDeferredValue(items);
  const editing = list.find((item) => item.id === editingId) ?? null;
  const remove = useConfirmedDelete(deleteMutation, list, labelOf, undoKind);

  return {
    list,
    rowProps: (item: T) => ({
      onEdit: () => setEditingId(item.id),
      ...remove.deleteProps(item.id),
    }),
    editProps: { item: editing, onClose: () => setEditingId(null) },
    dialogProps: remove.dialogProps,
  };
}
