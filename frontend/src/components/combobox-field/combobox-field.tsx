import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ChoiceFieldProps } from "@/components/select-field/select-field";
import { selectItemClass, selectTriggerClass } from "@/components/ui/select/select";
import type { SelectOption } from "@/lib/options";
import { cn } from "@/lib/utils";

function optionText(option: SelectOption) {
  return typeof option.label === "string" ? option.label : option.value;
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
  "aria-busy": ariaBusy,
  onBlur,
}: Readonly<ChoiceFieldProps<T>>) {
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
          aria-busy={ariaBusy}
          onBlur={onBlur}
          className={cn(
            selectTriggerClass,
            "w-full min-w-0 text-left",
            variant === "ghost" &&
              "py-1 whitespace-normal data-[size=sm]:h-auto data-[size=sm]:min-h-8 pointer-coarse:data-[size=sm]:h-auto pointer-coarse:data-[size=sm]:min-h-11",
            className,
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1",
              variant === "ghost" ? "line-clamp-2 wrap-break-word" : "truncate",
            )}
            title={typeof selected?.label === "string" ? selected.label : undefined}
          >
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
              className="flex max-h-[min(24rem,var(--available-height))] w-(--anchor-width) min-w-56 origin-(--transform-origin) flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-quick data-ending-style:opacity-0 data-starting-style:opacity-0"
            >
              <div className="relative border-b">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Combobox.Input
                  placeholder={t("common.search")}
                  aria-label={t("common.search")}
                  className="h-9 w-full bg-transparent pr-2 pl-8 text-base focus-ring-inset outline-none placeholder:text-muted-foreground md:text-sm"
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
                    className={cn(
                      selectItemClass,
                      "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                    )}
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
