import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function SplitColumns({ className, ...props }: Readonly<ComponentProps<"div">>) {
  return (
    <div
      data-slot="split-columns"
      className={cn("grid gap-x-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]", className)}
      {...props}
    />
  );
}
