import { CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import { INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";

export function DoneLine({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p className="flex items-start gap-2.5 py-2.5 text-sm text-muted-foreground">
      <CircleCheck aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", INCOME_TONE)} />
      {children}
    </p>
  );
}

export const lineClass = "py-2.5 text-sm focus-ring";
