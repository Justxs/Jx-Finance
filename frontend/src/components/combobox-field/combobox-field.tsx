import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, Search } from "lucide-react";
import type { FocusEventHandler } from "react";
import { useTranslation } from "react-i18next";
import type { SelectOption } from "@/components/select-field/select-field";
import { cn } from "@/lib/utils";

function optionText(option: SelectOption) {
  return typeof option.label === "string" ? option.label : option.value;
}

interface Props<T extends string> {
  id?: string;
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | "default";
  variant?: "default" | "ghost";
  className?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
}

export function ComboboxField<T extends string>({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  size = "default",
  variant = "default",
  className,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  onBlur,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <div className="min-w-0">
      <Combobox.Root
        items={options}
        value={selected}
        disabled={disabled}
        autoHighlight
        itemToStringLabel={optionText}
        isItemEqualToValue={(item: SelectOption<T>, current: SelectOption<T>) =>
          item.value === current.value
        }
        onValueChange={(next: SelectOption<T> | null) => {
          if (next) {
            onChange(next.value);
          }
        }}
      >
        <Combobox.Trigger
          id={id}
          data-size={size}
          data-variant={variant}
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          onBlur={onBlur}
          className={cn(
            "flex h-9 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input bg-muted/40 py-2 pr-2.5 pl-3 text-left text-base whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=sm]:h-8 data-[variant=ghost]:border-transparent data-[variant=ghost]:bg-transparent data-[variant=ghost]:pl-2 data-[variant=ghost]:hover:border-input md:text-sm dark:bg-input/30 dark:hover:bg-input/50 dark:data-[variant=ghost]:bg-transparent pointer-coarse:h-11",
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            <Combobox.Value placeholder={placeholder} />
          </span>
          <Combobox.Icon
            render={<ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />}
          />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner align="start" sideOffset={4} className="isolate z-50">
            <Combobox.Popup
              aria-label={ariaLabel}
              className="flex max-h-[min(24rem,var(--available-height))] w-(--anchor-width) min-w-56 origin-(--transform-origin) flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0"
            >
              <div className="relative border-b">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Combobox.Input
                  placeholder={t("common.search")}
                  aria-label={t("common.search")}
                  className="h-9 w-full bg-transparent pr-2 pl-8 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                />
              </div>
              <Combobox.Empty className="px-3 py-2 text-sm text-muted-foreground empty:hidden">
                {t("common.noMatches")}
              </Combobox.Empty>
              <Combobox.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 empty:hidden">
                {(option: SelectOption<T>) => (
                  <Combobox.Item
                    key={option.value}
                    value={option}
                    disabled={option.disabled}
                    className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm wrap-anywhere outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    {option.label}
                    <Combobox.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                      <CheckIcon className="size-4" />
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}
