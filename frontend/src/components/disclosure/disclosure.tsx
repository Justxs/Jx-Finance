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
      <summary className="w-fit cursor-pointer rounded-sm py-1 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
        {summary}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
