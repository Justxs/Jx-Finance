import type { FieldWithValue } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { SelectField, type SelectOption } from "@/components/select-field";
import { FieldShell, fieldAria } from "../field-shell";

interface Props {
  field: FieldWithValue<string>;
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  selectClassName?: string;
  "aria-label"?: string;
  touchedOnly?: boolean;
  onValueChange?: (value: string, previous: string) => void;
}

export function SelectFieldControl({
  field,
  id,
  label,
  hint,
  options,
  placeholder,
  disabled,
  className,
  selectClassName,
  "aria-label": ariaLabel,
  touchedOnly,
  onValueChange,
}: Readonly<Props>) {
  const { error, ...aria } = fieldAria(field, { id, hint, touchedOnly });

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <SelectField
        {...aria}
        id={id}
        aria-label={ariaLabel}
        value={field.value}
        placeholder={placeholder}
        disabled={disabled}
        className={selectClassName}
        options={options}
        onBlur={field.handleBlur}
        onChange={(next) => {
          const previous = field.value;
          field.handleChange(next);
          onValueChange?.(next, previous);
        }}
      />
    </FieldShell>
  );
}
