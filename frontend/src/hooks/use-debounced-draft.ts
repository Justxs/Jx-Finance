import { useDebouncer } from "@tanstack/react-pacer";
import { useState } from "react";

export function useDebouncedDraft(value: string, onCommit: (value: string) => void, wait: number) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  const debouncer = useDebouncer(onCommit, { wait });

  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  function change(next: string) {
    setDraft(next);
    if (wait === 0) {
      debouncer.cancel();
      onCommit(next);
      return;
    }
    debouncer.maybeExecute(next);
  }

  function cancel() {
    debouncer.cancel();
  }

  return { draft, change, cancel };
}
