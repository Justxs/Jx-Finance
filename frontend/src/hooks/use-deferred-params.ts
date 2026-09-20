import { useDeferredValue, useState } from "react";

export function useDeferredParams<T extends Record<string, unknown>>(params: T): [T, boolean] {
  const key = JSON.stringify(params);
  const [held, setHeld] = useState({ key, params });
  let current = held;
  if (held.key !== key) {
    current = { key, params };
    setHeld(current);
  }

  const shown = useDeferredValue(current.params);
  const stale = shown !== current.params;

  return [stale ? shown : params, stale];
}
