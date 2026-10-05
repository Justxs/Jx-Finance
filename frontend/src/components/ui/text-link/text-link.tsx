import { createLink } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function TextAnchor({ className, children, ...props }: Readonly<ComponentProps<"a">>) {
  return (
    <a
      data-slot="text-link"
      className={cn(
        "rounded-sm font-medium text-primary underline-offset-4 focus-ring hover:underline",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export const TextLink = createLink(TextAnchor);
