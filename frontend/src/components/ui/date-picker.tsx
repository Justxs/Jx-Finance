import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { type FocusEventHandler, type ToggleEvent, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useDate } from "@/hooks/use-formatters";
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

interface MonthView {
  year: number;
  month: number;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseIso(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function monthOf(date: Date): MonthView {
  return { year: date.getFullYear(), month: date.getMonth() };
}

function shiftMonth(view: MonthView, delta: number): MonthView {
  return monthOf(new Date(view.year, view.month + delta, 1));
}

function gridDays(view: MonthView): Date[] {
  const first = new Date(view.year, view.month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    return new Date(view.year, view.month, index + 1 - offset);
  });
}

function weekdayLabels(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: "short" });
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2024, 0, index + 1)));
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
  const { t, i18n } = useTranslation();
  const dateFormat = useDate();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const [view, setView] = useState<MonthView>(() => monthOf(selected ?? new Date()));

  const todayIso = toIso(new Date());
  const monthLabel = new Intl.DateTimeFormat(i18n.language, {
    month: "long",
    year: "numeric",
  }).format(new Date(view.year, view.month, 1));

  function handleToggle(event: ToggleEvent<HTMLDivElement>) {
    const opening = event.newState === "open";
    setOpen(opening);
    if (!opening) {
      return;
    }
    setView(monthOf(selected ?? new Date()));
    const panel = panelRef.current;
    const button = buttonRef.current;
    if (!panel || !button) {
      return;
    }
    const anchor = button.getBoundingClientRect();
    const size = panel.getBoundingClientRect();
    let top = anchor.bottom + 6;
    if (top + size.height > window.innerHeight - 8) {
      top = Math.max(8, anchor.top - size.height - 6);
    }
    const left = Math.max(8, Math.min(anchor.left, window.innerWidth - size.width - 8));
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
  }

  function pick(next: string) {
    onChange(next);
    panelRef.current?.hidePopover();
  }

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={panelId}
        popoverTarget={panelId}
        onBlur={onBlur}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-muted/40 px-3.5 py-2 text-left text-sm outline-none transition-all focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20",
          open && "border-primary bg-background ring-2 ring-primary/20",
          className,
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? dateFormat.format(selected) : (placeholder ?? t("datePicker.placeholder"))}
        </span>
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <div
        ref={panelRef}
        id={panelId}
        popover="auto"
        role="dialog"
        onToggle={handleToggle}
        className="fixed inset-auto m-0 max-h-[calc(100dvh-1rem)] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-md border bg-popover p-3 text-popover-foreground shadow-lg"
      >
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setView((prev) => shiftMonth(prev, -1))}
            aria-label={t("actions.previous")}
          >
            <ChevronLeft />
          </Button>
          <span className="text-sm font-medium capitalize">{monthLabel}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setView((prev) => shiftMonth(prev, 1))}
            aria-label={t("actions.next")}
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="mt-2 grid grid-cols-7">
          {weekdayLabels(i18n.language).map((label) => (
            <span
              key={label}
              className="flex h-8 items-center justify-center text-xs font-medium capitalize text-muted-foreground"
            >
              {label}
            </span>
          ))}
          {gridDays(view).map((day) => {
            const iso = toIso(day);
            const inMonth = day.getMonth() === view.month;
            const isSelected = iso === value;
            const isToday = iso === todayIso;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => pick(iso)}
                className={cn(
                  "flex h-9 w-full items-center justify-center rounded-md text-sm tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground",
                  !inMonth && "text-muted-foreground/50",
                  isToday && !isSelected && "font-semibold text-primary",
                  isSelected &&
                    "bg-primary font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                )}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => pick("")}>
            {t("datePicker.clear")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => pick(todayIso)}>
            {t("datePicker.today")}
          </Button>
        </div>
      </div>
    </>
  );
}
