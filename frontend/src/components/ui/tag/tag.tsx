import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "border-border text-muted-foreground",
  accent: "border-transparent bg-accent text-accent-foreground",
  positive: "border-income/35 text-income",
  negative: "border-expense/35 text-expense",
} as const;

interface Props {
  tone?: keyof typeof tones;
  className?: string;
  children: ReactNode;
}

export function Tag({ tone = "neutral", className, children }: Readonly<Props>) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm border px-1.5 text-xs leading-5 font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

interface HintTagProps {
  hint: string;
  tone?: keyof typeof tones;
  children: ReactNode;
}

export function HintTag({ hint, tone, children }: Readonly<HintTagProps>) {
  return (
    <Tooltip content={hint}>
      <span className="inline-flex">
        <Tag tone={tone}>
          {children}
          <span className="sr-only">. {hint}</span>
        </Tag>
      </span>
    </Tooltip>
  );
}
