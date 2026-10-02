import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function Disclosure({ summary, children, defaultOpen = false, className }: Readonly<Props>) {
  return (
    <details className={cn("group", className)} open={defaultOpen}>
      <summary className="w-fit cursor-pointer rounded-sm py-1 text-sm font-medium text-muted-foreground focus-ring hover:text-foreground">
        {summary}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
