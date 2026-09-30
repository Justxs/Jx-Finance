import { type FocusEventHandler, Fragment } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select/select";
import type { SelectOption } from "@/lib/options";
import { cn } from "@/lib/utils";

function optionGroups<T extends string>(options: SelectOption<T>[]) {
  const groups: { label?: string; options: SelectOption<T>[] }[] = [];
  for (const option of options) {
    const last = groups.at(-1);
    if (last && last.label === option.group) {
      last.options.push(option);
    } else {
      groups.push({ label: option.group, options: [option] });
    }
  }
  return groups;
}

export interface ChoiceFieldProps<T extends string> {
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
  "aria-busy"?: boolean;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
}

export function SelectField<T extends string>({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  size,
  variant,
  className,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-busy": ariaBusy,
  onBlur,
}: Readonly<ChoiceFieldProps<T>>) {
  return (
    <div className="min-w-0">
      <Select
        items={options}
        value={value}
        onValueChange={(next) => {
          const chosen = options.find((option) => option.value === next);
          if (chosen) {
            onChange(chosen.value);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-busy={ariaBusy}
          onBlur={onBlur}
          size={size}
          variant={variant}
          className={cn("w-full min-w-0", className)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {optionGroups(options).map((group) => {
            const items = group.options.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </SelectItem>
            ));
            return group.label ? (
              <SelectGroup key={group.label}>
                <SelectGroupLabel>{group.label}</SelectGroupLabel>
                {items}
              </SelectGroup>
            ) : (
              <Fragment key={group.options[0]?.value}>{items}</Fragment>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
