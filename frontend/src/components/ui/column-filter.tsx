import { ListFilter } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  active: boolean;
  onClear: () => void;
  children: ReactNode;
}

export function ColumnFilter({ label, active, onClear, children }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("filters.filterBy", { column: label })}
        title={t("filters.filterBy", { column: label })}
        className={cn(
          "rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
          active && "bg-primary/15 text-primary",
        )}
      >
        <ListFilter className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={label} className="w-64 font-normal tracking-normal">
        <div className="space-y-2">{children}</div>
        <div className="flex justify-end border-t pt-2">
          <Button type="button" variant="ghost" size="sm" disabled={!active} onClick={onClear}>
            {t("filters.clear")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
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
