import { useState } from "react";

const NO_SELECTION: ReadonlySet<string> = new Set();

interface SelectionState {
  viewKey: string;
  ids: ReadonlySet<string>;
}

export function useTransactionSelection(viewKey: string) {
  const [selection, setSelection] = useState<SelectionState>({ viewKey, ids: NO_SELECTION });
  const selectedIds = selection.viewKey === viewKey ? selection.ids : NO_SELECTION;

  function setSelectedIds(ids: ReadonlySet<string>) {
    setSelection({ viewKey, ids });
  }

  function clear() {
    setSelectedIds(NO_SELECTION);
  }

  function toggle(id: string, selected: boolean) {
    setSelection((previous) => {
      const next = new Set(previous.viewKey === viewKey ? previous.ids : NO_SELECTION);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return { viewKey, ids: next };
    });
  }

  function togglePage(selectableIds: readonly string[], selected: boolean) {
    setSelectedIds(selected ? new Set(selectableIds) : NO_SELECTION);
  }

  return { selectedIds, clear, toggle, togglePage };
}
