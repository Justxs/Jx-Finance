import type { FieldWithValue } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { ComboboxField } from "@/components/combobox-field/combobox-field";
import { FieldShell, fieldAria } from "@/components/form/field-shell/field-shell";
import { SelectField } from "@/components/select-field/select-field";
import { SegmentedControl } from "@/components/ui/segmented-control/segmented-control";
import type { SelectOption } from "@/lib/options";

interface Props {
  field: FieldWithValue<string>;
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  options: SelectOption[];
  kind?: "select" | "search" | "segments";
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  fitContent?: boolean;
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
  kind = "select",
  placeholder,
  disabled,
  className,
  fitContent,
  "aria-label": ariaLabel,
  touchedOnly,
  onValueChange,
}: Readonly<Props>) {
  const { error, ...aria } = fieldAria(field, { id, hint, touchedOnly });

  function handleChange(next: string) {
    const previous = field.value;
    field.handleChange(next);
    onValueChange?.(next, previous);
  }

  const shared = {
    id,
    value: field.value,
    options,
    disabled,
    onChange: handleChange,
    "aria-describedby": aria["aria-describedby"],
  };

  let control: ReactNode;
  if (kind === "segments") {
    control = (
      <SegmentedControl
        {...shared}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel || !label ? undefined : `${id}-label`}
      />
    );
  } else if (kind === "search") {
    control = (
      <ComboboxField
        {...shared}
        aria-invalid={aria["aria-invalid"]}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onBlur={field.handleBlur}
      />
    );
  } else {
    control = (
      <SelectField
        {...shared}
        aria-invalid={aria["aria-invalid"]}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={fitContent ? "sm:w-auto" : undefined}
        onBlur={field.handleBlur}
      />
    );
  }

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      {control}
    </FieldShell>
  );
}
