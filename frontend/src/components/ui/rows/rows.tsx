import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Rows({ className, ...props }: Readonly<ComponentProps<"ul">>) {
  return <ul data-slot="rows" className={cn("divide-y divide-border", className)} {...props} />;
}
