import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Label({ className, htmlFor, id, ...props }: ComponentProps<"label">) {
  return (
    <label
      htmlFor={htmlFor}
      id={id ?? (htmlFor ? `${htmlFor}-label` : undefined)}
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-5 font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
