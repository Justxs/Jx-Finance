import { CalendarDays } from "lucide-react";
import { type FocusEventHandler, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCalendarLocale, useDate } from "@/hooks/use-formatters";
import { parseIso, toIso } from "@/lib/calendar";
import { cn } from "@/lib/utils";

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
  onBlur,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const dateFormat = useDate();
  const locale = useCalendarLocale();
  const [open, setOpen] = useState(false);
  const selected = parseIso(value) ?? undefined;
  const [month, setMonth] = useState(selected ?? new Date());

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setMonth(selected ?? new Date());
    }
  }

  function pick(next: string) {
    onChange(next);
    setOpen(false);
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
            aria-invalid={ariaInvalid}
            onBlur={onBlur}
            className={cn(
              "w-full min-w-0 justify-between border-input bg-muted/40 px-3 text-base font-normal hover:bg-muted/60 aria-expanded:border-ring aria-expanded:bg-background md:text-sm dark:bg-input/30",
              className,
            )}
          />
        }
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? dateFormat.format(selected) : (placeholder ?? t("datePicker.placeholder"))}
        </span>
        <CalendarDays className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-2">
        <Calendar
          mode="single"
          locale={locale}
          weekStartsOn={1}
          selected={selected}
          month={month}
          onMonthChange={setMonth}
          onSelect={(date) => pick(date ? toIso(date) : "")}
        />
        <div className="flex items-center justify-between border-t pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => pick("")}>
            {t("datePicker.clear")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => pick(toIso(new Date()))}>
            {t("datePicker.today")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
