import type { ReactNode } from "react";
import { type DeleteProps, RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Meter } from "@/components/ui/meter/meter";
import {
  IconButtonSkeleton,
  Skeleton,
  TextSkeleton,
  rowWidth,
} from "@/components/ui/skeleton/skeleton";
import { cn } from "@/lib/utils";

const gridClass =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto_auto]";
const amountClass =
  "col-span-2 row-start-2 min-w-0 text-sm sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:max-w-72";
const actionsClass = "col-start-2 row-start-1 sm:col-start-3";

interface ProgressMeter {
  value: number;
  max: number;
  tone: "primary" | "positive" | "negative";
}

interface Props extends DeleteProps {
  label: string;
  title: ReactNode;
  titleHint?: string;
  meta?: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
  meter: ProgressMeter | null;
  onEdit?: () => void;
  children?: ReactNode;
}

export function ProgressAmount({ amount, of }: Readonly<{ amount: string; of: string }>) {
  return (
    <>
      <span className="font-semibold whitespace-nowrap">{amount}</span>{" "}
      <span className="whitespace-nowrap text-muted-foreground">{of}</span>
    </>
  );
}

export function ProgressRow({
  label,
  title,
  titleHint,
  meta,
  primary,
  secondary,
  meter,
  onEdit,
  children,
  ...deleteProps
}: Readonly<Props>) {
  return (
    <RowTransition>
      <li className="py-3">
        <div className={gridClass}>
          <div className="min-w-0">
            <p
              className={cn("min-w-0 font-medium wrap-break-word", titleHint && "line-clamp-2")}
              title={titleHint}
            >
              {title}
            </p>
            {meta}
          </div>
          <div className={cn(amountClass, "sm:text-right")}>
            <p className="tabular-nums">{primary}</p>
            {secondary}
          </div>
          <RowActions
            label={label}
            onEdit={onEdit}
            {...deleteProps}
            size="icon"
            className={cn(actionsClass, "gap-0")}
          />
        </div>
        {meter ? (
          <Meter
            value={meter.value}
            max={meter.max}
            tone={meter.tone}
            label={label}
            className="mt-2"
          />
        ) : null}
        {children}
      </li>
    </RowTransition>
  );
}

export function ProgressRowsSkeleton({ rows = 4 }: Readonly<{ rows?: number }>) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} aria-hidden="true" className="py-3">
          <div className={gridClass}>
            <div className="min-w-0">
              <TextSkeleton width={rowWidth(index)} />
              <TextSkeleton size="xs" width="w-40" />
            </div>
            <div className={amountClass}>
              <TextSkeleton size="sm" className="sm:justify-end" width="w-32" />
              <TextSkeleton size="xs" className="sm:justify-end" width="w-24" />
            </div>
            <div className={cn(actionsClass, "flex")}>
              <IconButtonSkeleton size="md" />
              <IconButtonSkeleton size="md" />
            </div>
          </div>
          <Skeleton className="mt-2 h-1.5 w-full rounded-none" />
        </li>
      ))}
    </>
  );
}
