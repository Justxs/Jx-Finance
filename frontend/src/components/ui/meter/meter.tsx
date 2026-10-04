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
  mark?: number;
  className?: string;
}

export function Meter({ value, max, tone = "primary", label, mark, className }: Readonly<Props>) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <div
      role={label ? "meter" : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? max : undefined}
      aria-valuenow={label ? Math.min(value, max) : undefined}
      className={cn("relative h-1.5 bg-border", className)}
    >
      <div
        data-slot="meter-fill"
        className={cn(
          "h-full origin-left scale-x-(--meter-fill) transition-transform duration-slow ease-out-expo",
          tones[tone],
        )}
        style={{ "--meter-fill": `${ratio * 100}%` }}
      />
      {mark === undefined ? null : (
        <div
          className="absolute -inset-y-0.5 left-(--meter-mark) w-0.5 -translate-x-1/2 bg-foreground"
          style={{ "--meter-mark": `${Math.min(1, Math.max(0, mark)) * 100}%` }}
        />
      )}
    </div>
  );
}
