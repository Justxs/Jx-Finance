import { useDeferredValue, useState } from "react";
import type { TrashKind } from "@/api/generated/model";
import { type DeleteMutation, useConfirmedDelete } from "@/hooks/use-confirmed-delete";

export function useEditableList<T extends { id: string }>(
  items: readonly T[],
  deleteMutation: DeleteMutation,
  labelOf: (item: T) => string | null | undefined,
  undoKind?: TrashKind,
) {
  const [editing, setEditing] = useState<T | null>(null);
  const list = useDeferredValue(items);
  const remove = useConfirmedDelete(deleteMutation, list, labelOf, undoKind);

  return {
    list,
    rowProps: (item: T) => ({ onEdit: () => setEditing(item), ...remove.deleteProps(item.id) }),
    editProps: { item: editing, onClose: () => setEditing(null) },
    dialogProps: remove.dialogProps,
  };
}
