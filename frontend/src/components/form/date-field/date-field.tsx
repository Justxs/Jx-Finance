import type { FieldWithValue } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldShell, fieldAria } from "../field-shell";

interface Props {
  field: FieldWithValue<string>;
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  touchedOnly?: boolean;
}

export function DateField({
  field,
  id,
  label,
  hint,
  placeholder,
  disabled,
  className,
  touchedOnly,
}: Readonly<Props>) {
  const { error, ...aria } = fieldAria(field, { id, hint, touchedOnly });

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <DatePicker
        {...aria}
        id={id}
        value={field.value}
        placeholder={placeholder}
        disabled={disabled}
        onBlur={field.handleBlur}
        onChange={field.handleChange}
      />
    </FieldShell>
  );
}
