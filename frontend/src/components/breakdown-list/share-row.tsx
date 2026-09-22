import type { ReactNode } from "react";
import { Meter } from "@/components/ui/meter/meter";
import { cn } from "@/lib/utils";

interface Props {
  name: ReactNode;
  icon?: ReactNode;
  share?: ReactNode;
  note?: ReactNode;
  amount: string;
  wideAmount?: boolean;
  value: number;
  max: number;
  tone?: "primary" | "positive" | "negative";
  meterLabel?: string;
  children?: ReactNode;
}

export function ShareRow({
  name,
  icon,
  share,
  note,
  amount,
  wideAmount = false,
  value,
  max,
  tone,
  meterLabel,
  children,
}: Readonly<Props>) {
  return (
    <li>
      <div className="flex items-baseline gap-3 text-sm">
        {icon}
        {name}
        {note ?? (
          <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
            {share}
          </span>
        )}
        <span
          className={cn(
            "shrink-0 text-right font-medium tabular-nums",
            wideAmount ? "w-28" : "w-24",
          )}
        >
          {amount}
        </span>
      </div>
      <Meter value={value} max={max} tone={tone} label={meterLabel} className="mt-1.5" />
      {children}
    </li>
  );
}
