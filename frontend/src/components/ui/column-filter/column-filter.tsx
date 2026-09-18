import { useDebouncer } from "@tanstack/react-pacer";
import { ListFilter } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  active: boolean;
  onClear: () => void;
  children: ReactNode;
  shortcut?: string;
}

export function ColumnFilter({ label, active, onClear, children, shortcut }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Popover>
      <Tooltip content={t("filters.filterBy", { column: label })}>
        <PopoverTrigger
          aria-label={t("filters.filterBy", { column: label })}
          data-shortcut={shortcut}
          className={cn(
            "rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground pointer-coarse:p-3",
            active && "bg-primary/15 text-primary",
          )}
        >
          <ListFilter className="size-3.5" />
        </PopoverTrigger>
      </Tooltip>
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
  shortcut?: string;
}

export function TextColumnFilter({
  label,
  value,
  onChange,
  placeholder,
  debounceMs = 0,
  shortcut,
}: Readonly<TextFilterProps>) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  const debouncer = useDebouncer(onChange, { wait: debounceMs });

  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  function handleChange(next: string) {
    setDraft(next);
    if (debounceMs === 0) {
      debouncer.cancel();
      onChange(next);
      return;
    }
    debouncer.maybeExecute(next);
  }

  return (
    <ColumnFilter
      label={label}
      active={Boolean(value)}
      shortcut={shortcut}
      onClear={() => {
        debouncer.cancel();
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
