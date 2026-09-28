import type { ReactNode } from "react";
import { Meter } from "@/components/ui/meter/meter";
import { Skeleton, TextSkeleton, rowWidth } from "@/components/ui/skeleton/skeleton";
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
  meterMark?: number;
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
  meterMark,
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
      <Meter
        value={value}
        max={max}
        tone={tone}
        label={meterLabel}
        mark={meterMark}
        className="mt-1.5"
      />
      {children}
    </li>
  );
}

interface SkeletonProps {
  rows: number;
  share?: boolean;
  compared?: boolean;
}

export function ShareRowsSkeleton({
  rows,
  share = true,
  compared = false,
}: Readonly<SkeletonProps>) {
  return (
    <ul data-slot="share-rows-skeleton" aria-hidden="true" className="space-y-3.5">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index}>
          <div className="flex items-center gap-3">
            <TextSkeleton size="sm" className="flex-1" width={rowWidth(index)} />
            {share ? (
              <TextSkeleton size="xs" className="w-10 shrink-0 justify-end" width="w-8" />
            ) : null}
            <TextSkeleton size="sm" className="w-24 shrink-0 justify-end" width="w-20" />
          </div>
          <Skeleton className="mt-1.5 h-1.5 w-full rounded-none" />
          {compared ? <TextSkeleton size="xs" className="mt-1 justify-end" width="w-36" /> : null}
        </li>
      ))}
    </ul>
  );
}
