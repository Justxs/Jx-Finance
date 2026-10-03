import { useSyncExternalStore } from "react";

const WIDE_LEDGER_QUERY = "(min-width: 80rem)";

function subscribe(onChange: () => void) {
  const query = globalThis.matchMedia(WIDE_LEDGER_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isWide() {
  return globalThis.matchMedia(WIDE_LEDGER_QUERY).matches;
}

export function useWideLedger() {
  return useSyncExternalStore(subscribe, isWide);
}
