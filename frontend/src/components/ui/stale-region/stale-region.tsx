import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface Props extends ComponentProps<"div"> {
  stale: boolean;
}

export function StaleRegion({ stale, className, ...props }: Readonly<Props>) {
  return (
    <div
      data-slot="stale-region"
      data-stale={stale ? "" : undefined}
      aria-busy={stale}
      className={cn(stale && "stale", className)}
      {...props}
    />
  );
}
