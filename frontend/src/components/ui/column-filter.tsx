import { ListFilter } from "lucide-react";
import { type ReactNode, type ToggleEvent, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { positionPopover } from "@/lib/popover";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  active: boolean;
  onClear: () => void;
  children: ReactNode;
}

export function ColumnFilter({ label, active, onClear, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function handleToggle(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState !== "open") {
      return;
    }
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    if (!panel || !trigger) {
      return;
    }
    positionPopover(panel, trigger);
    panel.querySelector<HTMLElement>("input, select, button")?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={panelId}
        aria-haspopup="dialog"
        aria-label={t("filters.filterBy", { column: label })}
        title={t("filters.filterBy", { column: label })}
        className={cn(
          "rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
          active && "bg-primary/15 text-primary",
        )}
      >
        <ListFilter className="size-3.5" />
      </button>

      <div
        ref={panelRef}
        id={panelId}
        popover="auto"
        role="dialog"
        aria-label={label}
        onToggle={handleToggle}
        className="fixed inset-auto m-0 w-64 max-w-[calc(100vw-1rem)] rounded-md border bg-popover p-3 text-sm font-normal tracking-normal text-popover-foreground shadow-lg"
      >
        <div className="space-y-2">{children}</div>
        <div className="mt-3 flex justify-end border-t pt-2">
          <Button type="button" variant="ghost" size="sm" disabled={!active} onClick={onClear}>
            {t("filters.clear")}
          </Button>
        </div>
      </div>
    </>
  );
}

interface TextFilterProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function TextColumnFilter({
  label,
  value,
  onChange,
  placeholder,
  debounceMs = 0,
}: Readonly<TextFilterProps>) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  function handleChange(next: string) {
    setDraft(next);
    clearTimeout(timer.current);
    if (debounceMs === 0) {
      onChange(next);
      return;
    }
    timer.current = setTimeout(() => onChange(next), debounceMs);
  }

  return (
    <ColumnFilter
      label={label}
      active={!!value}
      onClear={() => {
        clearTimeout(timer.current);
        onChange("");
      }}
    >
      <Input
        placeholder={placeholder ?? label}
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
      />
    </ColumnFilter>
  );
}
