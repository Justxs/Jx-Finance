import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCalendarLocale, useDate } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { parseIso, toIso } from "@/lib/calendar";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: string;
  to: string;
}

interface Props {
  id?: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const dateFormat = useDate();
  const locale = useCalendarLocale();
  const today = useToday();
  const todayDate = parseIso(today) ?? new Date();
  const [open, setOpen] = useState(false);

  const from = parseIso(value.from) ?? undefined;
  const to = parseIso(value.to) ?? undefined;
  const [month, setMonth] = useState(from ?? todayDate);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setMonth(from ?? todayDate);
    }
  }

  function pick(iso: string) {
    const startingOver = !value.from || Boolean(value.to);
    if (startingOver) {
      onChange({ from: iso, to: "" });
      return;
    }

    if (iso < value.from) {
      onChange({ from: iso, to: value.from });
    } else {
      onChange({ from: value.from, to: iso });
    }
    setOpen(false);
  }

  let label = placeholder ?? t("datePicker.anyDate");
  if (from && to) {
    label = `${dateFormat.format(from)} – ${dateFormat.format(to)}`;
  } else if (from) {
    label = `${dateFormat.format(from)} –`;
  } else if (to) {
    label = `– ${dateFormat.format(to)}`;
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full min-w-0 justify-between border-input bg-muted/40 px-3 text-base font-normal hover:bg-muted/60 aria-expanded:border-ring aria-expanded:bg-background md:text-sm dark:bg-input/30",
              className,
            )}
          />
        }
      >
        <span className={cn("truncate", !from && !to && "text-muted-foreground")}>{label}</span>
        <CalendarDays className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-2">
        <Calendar
          mode="range"
          locale={locale}
          selected={{ from, to }}
          month={month}
          onMonthChange={setMonth}
          onDayClick={(day) => pick(toIso(day))}
        />
        <div className="flex items-center justify-between gap-2 border-t pt-2">
          <span className="truncate text-xs text-muted-foreground">
            {value.from && !value.to ? t("datePicker.pickEnd") : t("datePicker.pickStart")}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!value.from && !value.to}
            onClick={() => onChange({ from: "", to: "" })}
          >
            {t("datePicker.clear")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
