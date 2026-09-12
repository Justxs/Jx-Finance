import { CalendarDays } from "lucide-react";
import { type ToggleEvent, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useDate } from "@/hooks/use-formatters";
import { type MonthView, monthOf, parseIso } from "@/lib/calendar";
import { positionPopover } from "@/lib/popover";
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
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const from = parseIso(value.from);
  const to = parseIso(value.to);
  const [view, setView] = useState<MonthView>(() => monthOf(from ?? new Date()));

  function handleToggle(event: ToggleEvent<HTMLDivElement>) {
    const opening = event.newState === "open";
    setOpen(opening);
    if (!opening) {
      return;
    }
    setView(monthOf(from ?? new Date()));
    const panel = panelRef.current;
    const button = buttonRef.current;
    if (panel && button) {
      positionPopover(panel, button);
    }
  }

  function pick(iso: string) {
    const startingOver = !value.from || !!value.to;
    if (startingOver) {
      onChange({ from: iso, to: "" });
      return;
    }

    if (iso < value.from) {
      onChange({ from: iso, to: value.from });
    } else {
      onChange({ from: value.from, to: iso });
    }
    panelRef.current?.hidePopover();
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
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={panelId}
        popoverTarget={panelId}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-muted/40 px-3.5 py-2 text-left text-sm outline-none transition-all focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-primary bg-background ring-2 ring-primary/20",
          className,
        )}
      >
        <span className={cn("truncate", !from && !to && "text-muted-foreground")}>{label}</span>
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
        <Calendar
          view={view}
          onViewChange={setView}
          from={value.from}
          to={value.to}
          onPick={pick}
        />

        <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
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
      </div>
    </>
  );
}
