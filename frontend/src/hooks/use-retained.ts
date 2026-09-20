import { useState } from "react";

export function useRetained<T>(value: T, keep: boolean = value === null || value === undefined) {
  const [shown, setShown] = useState(value);

  if (!keep && value !== shown) {
    setShown(value);
  }

  return shown;
}
