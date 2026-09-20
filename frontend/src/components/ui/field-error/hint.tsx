import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Hint({ className, children, ...props }: Readonly<ComponentProps<"p">>) {
  return (
    <p data-slot="hint" className={cn("text-xs text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
}
