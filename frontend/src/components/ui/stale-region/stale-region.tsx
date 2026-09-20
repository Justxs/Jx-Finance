import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const staleVariants = cva("", {
  variants: {
    stale: {
      true: "relative cursor-progress after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:bg-rule motion-safe:after:animate-pulse",
      false: "",
    },
  },
  defaultVariants: { stale: false },
});

interface Props extends ComponentProps<"div"> {
  stale: boolean;
}

export function StaleRegion({ stale, className, ...props }: Readonly<Props>) {
  return (
    <div
      data-slot="stale-region"
      data-stale={stale ? "" : undefined}
      aria-busy={stale}
      className={cn(staleVariants({ stale }), className)}
      {...props}
    />
  );
}
