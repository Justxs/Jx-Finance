import { CalendarDays } from "lucide-react";
import { type FocusEventHandler, type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover/popover";
import { cn } from "@/lib/utils";

interface CalendarPopoverApi {
  month: Date;
  setMonth: (month: Date) => void;
  close: () => void;
}

interface Props {
  id?: string;
  label: string;
  empty: boolean;
  anchor: Date | undefined;
  today: Date;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  children: (api: CalendarPopoverApi) => ReactNode;
}

export function CalendarPopover({
  id,
  label,
  empty,
  anchor,
  today,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  onBlur,
  children,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(anchor ?? today);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setMonth(anchor ?? today);
    }
  }

  return (
    <div className="min-w-0">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              aria-invalid={ariaInvalid}
              aria-describedby={ariaDescribedBy}
              onBlur={onBlur}
              className={cn(
                "w-full min-w-0 justify-between border-input bg-muted/40 px-3 text-base font-normal hover:bg-muted/60 aria-expanded:border-ring aria-expanded:bg-background md:text-sm dark:bg-input/30",
                className,
              )}
            />
          }
        >
          <span className={cn("truncate", empty && "text-muted-foreground")}>{label}</span>
          <CalendarDays className="text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto gap-2">
          {children({ month, setMonth, close: () => setOpen(false) })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
