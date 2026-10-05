import { ListFilter } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button/button";
import { Input } from "@/components/ui/input/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover/popover";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { cn } from "@/lib/utils";

function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface Props<T> {
  label: string;
  value: T;
  empty: T;
  onApply: (value: T) => void;
  children: (draft: T, setDraft: (value: T) => void) => ReactNode;
  shortcut?: string;
  summary?: string;
}

export function ColumnFilter<T>({
  label,
  value,
  empty,
  onApply,
  children,
  shortcut,
  summary,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const active = !sameValue(value, empty);
  const triggerLabel =
    active && summary
      ? t("filters.filterByActive", { column: label, value: summary })
      : t("filters.filterBy", { column: label });

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(value);
    }
    setOpen(next);
  }

  function apply(next: T) {
    if (!sameValue(next, value)) {
      onApply(next);
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip content={triggerLabel}>
        <PopoverTrigger
          aria-label={triggerLabel}
          data-shortcut={shortcut}
          className={cn(
            "relative inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground focus-ring transition-colors hover:bg-accent hover:text-accent-foreground pointer-coarse:min-h-11 pointer-coarse:min-w-11",
            active && "bg-primary/15 text-primary",
          )}
        >
          <ListFilter aria-hidden="true" className="size-3.5" />
          {active ? (
            <span
              aria-hidden="true"
              className="absolute top-0.5 right-0.5 size-1.5 rounded-sm bg-primary"
            />
          ) : null}
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="start" aria-label={label} className="w-64 font-normal tracking-normal">
        <form
          className="flex flex-col gap-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            apply(draft);
          }}
        >
          <div className="space-y-2">{children(draft, setDraft)}</div>
          <div className="flex justify-end gap-2 border-t pt-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!active && sameValue(draft, empty)}
              onClick={() => apply(empty)}
            >
              {t("filters.clear")}
            </Button>
            <Button type="submit" size="sm" disabled={sameValue(draft, value)}>
              {t("filters.apply")}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

interface TextFilterProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  shortcut?: string;
  summary?: string;
}

export function TextColumnFilter({
  label,
  value,
  onChange,
  placeholder,
  shortcut,
  summary,
}: Readonly<TextFilterProps>) {
  return (
    <ColumnFilter
      label={label}
      value={value}
      empty=""
      shortcut={shortcut}
      summary={summary ?? value}
      onApply={onChange}
    >
      {(draft, setDraft) => (
        <Input
          aria-label={label}
          placeholder={placeholder ?? label}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      )}
    </ColumnFilter>
  );
}
