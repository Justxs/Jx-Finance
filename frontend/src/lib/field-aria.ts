import type { ReactNode } from "react";

interface ShellAriaOptions {
  id: string;
  hint?: ReactNode;
  error?: string;
}

export function shellAria({ id, hint, error }: ShellAriaOptions) {
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") ||
    undefined;

  return { "aria-invalid": Boolean(error), "aria-describedby": describedBy };
}
