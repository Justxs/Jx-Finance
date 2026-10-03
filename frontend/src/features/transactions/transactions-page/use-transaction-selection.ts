import { useState } from "react";

const NO_SELECTION: ReadonlySet<string> = new Set();

interface SelectionState {
  scope: string;
  ids: ReadonlySet<string>;
  anchor: string | null;
}

export function selectionRange(
  order: readonly string[],
  anchor: string | null,
  id: string,
  extend: boolean,
): string[] {
  const from = extend && anchor !== null ? order.indexOf(anchor) : -1;
  const to = order.indexOf(id);
  if (from === -1 || to === -1) {
    return [id];
  }
  return order.slice(Math.min(from, to), Math.max(from, to) + 1);
}

export function useTransactionSelection(scope: string, initialIds = NO_SELECTION) {
  const [selection, setSelection] = useState<SelectionState>({
    scope,
    ids: initialIds,
    anchor: null,
  });
  function inScope(state: SelectionState): SelectionState {
    return state.scope === scope ? state : { scope, ids: NO_SELECTION, anchor: null };
  }

  function clear() {
    setSelection({ scope, ids: NO_SELECTION, anchor: null });
  }

  function toggle(order: readonly string[], id: string, selected: boolean, extend: boolean) {
    setSelection((previous) => {
      const { ids, anchor } = inScope(previous);
      const next = new Set(ids);
      for (const target of selectionRange(order, anchor, id, extend)) {
        if (selected) {
          next.add(target);
        } else {
          next.delete(target);
        }
      }
      return { scope, ids: next, anchor: id };
    });
  }

  function togglePage(selectableIds: readonly string[], selected: boolean) {
    setSelection({ scope, ids: selected ? new Set(selectableIds) : NO_SELECTION, anchor: null });
  }

  return { selectedIds: inScope(selection).ids, clear, toggle, togglePage };
}
