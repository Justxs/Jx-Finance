import { ListFilter } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SelectField, type SelectOption } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { Input } from "@/components/ui/input/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover/popover";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { useDebouncedDraft } from "@/hooks/use-debounced-draft";
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
  const text = useDebouncedDraft(value, onChange, debounceMs);

  return (
    <ColumnFilter
      label={label}
      active={Boolean(value)}
      shortcut={shortcut}
      onClear={() => {
        text.cancel();
        onChange("");
      }}
    >
      <Input
        placeholder={placeholder ?? label}
        value={text.draft}
        onChange={(e) => text.change(e.target.value)}
      />
    </ColumnFilter>
  );
}

interface SelectFilterProps<T extends string> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T | "") => void;
}

export function SelectColumnFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: Readonly<SelectFilterProps<T>>) {
  return (
    <ColumnFilter label={label} active={value !== ""} onClear={() => onChange("")}>
      <SelectField aria-label={label} value={value} onChange={onChange} options={options} />
    </ColumnFilter>
  );
}
