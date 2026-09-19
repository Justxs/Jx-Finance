import type { FieldWithValue } from "@tanstack/react-form";
import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { FieldShell, fieldAria } from "../field-shell";

type InputProps = Omit<
  ComponentProps<typeof Input>,
  "id" | "value" | "onChange" | "onBlur" | "className" | "aria-invalid" | "aria-describedby"
>;

export interface TextFieldProps extends InputProps {
  field: FieldWithValue<string>;
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  className?: string;
  inputClassName?: string;
  touchedOnly?: boolean;
  parse?: (value: string) => string;
}

export function TextField({
  field,
  id,
  label,
  hint,
  className,
  inputClassName,
  touchedOnly,
  parse,
  ...inputProps
}: Readonly<TextFieldProps>) {
  const { error, ...aria } = fieldAria(field, { id, hint, touchedOnly });

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <Input
        {...inputProps}
        {...aria}
        id={id}
        className={inputClassName}
        value={field.value}
        onBlur={field.handleBlur}
        onChange={(event) =>
          field.handleChange(parse ? parse(event.target.value) : event.target.value)
        }
      />
    </FieldShell>
  );
}
