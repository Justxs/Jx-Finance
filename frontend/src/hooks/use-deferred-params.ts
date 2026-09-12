import { useDeferredValue } from "react";

export function useDeferredParams<T extends Record<string, unknown>>(params: T): [T, boolean] {
  const key = JSON.stringify(params);
  const shownKey = useDeferredValue(key);
  const stale = shownKey !== key;

  return [stale ? (JSON.parse(shownKey) as T) : params, stale];
}
