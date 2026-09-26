import type { ReactNode } from "react";
import { type DeleteProps, RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Meter } from "@/components/ui/meter/meter";
import { cn } from "@/lib/utils";

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
      <span className="font-semibold">{amount}</span>{" "}
      <span className="text-muted-foreground">{of}</span>
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
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="min-w-0">
            <p
              className={cn("min-w-0 font-medium wrap-break-word", titleHint && "line-clamp-2")}
              title={titleHint}
            >
              {title}
            </p>
            {meta}
          </div>
          <div className="col-span-2 row-start-2 min-w-0 text-sm sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:text-right">
            <p className="whitespace-nowrap tabular-nums">{primary}</p>
            {secondary}
          </div>
          <RowActions
            label={label}
            onEdit={onEdit}
            {...deleteProps}
            size="icon"
            className="col-start-2 row-start-1 gap-0 sm:col-start-3"
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
