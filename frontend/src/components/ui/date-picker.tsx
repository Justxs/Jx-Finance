import { CalendarDays } from "lucide-react";
import { type FocusEventHandler, type ToggleEvent, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useDate } from "@/hooks/use-formatters";
import { type MonthView, monthOf, parseIso, toIso } from "@/lib/calendar";
import { positionPopover } from "@/lib/popover";
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
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const [view, setView] = useState<MonthView>(() => monthOf(selected ?? new Date()));

  const todayIso = toIso(new Date());

  function handleToggle(event: ToggleEvent<HTMLDivElement>) {
    const opening = event.newState === "open";
    setOpen(opening);
    if (!opening) {
      return;
    }
    setView(monthOf(selected ?? new Date()));
    const panel = panelRef.current;
    const button = buttonRef.current;
    if (panel && button) {
      positionPopover(panel, button);
    }
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
        <Calendar view={view} onViewChange={setView} from={value} to={value} onPick={pick} />

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
