import { cn } from "@/lib/utils";

const tones = {
  primary: "bg-primary",
  positive: "bg-secondary",
  negative: "bg-destructive",
} as const;

interface Props {
  value: number;
  max: number;
  tone?: keyof typeof tones;
  label?: string;
  className?: string;
}

export function Meter({ value, max, tone = "primary", label, className }: Readonly<Props>) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <div
      role={label ? "meter" : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? max : undefined}
      aria-valuenow={label ? Math.min(value, max) : undefined}
      className={cn("h-1 bg-muted", className)}
    >
      <div
        className={cn("h-full transition-[width] duration-300 ease-out-expo", tones[tone])}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
