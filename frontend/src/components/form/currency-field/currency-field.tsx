import type { FieldWithValue } from "@tanstack/react-form";
import type { ReactNode } from "react";
import type { Currency } from "@/api/generated/model";
import { CurrencySelect } from "@/components/currency-select/currency-select";
import { FieldShell, fieldAria } from "../field-shell/field-shell";

interface Props {
  field: FieldWithValue<Currency>;
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  hintRole?: "status";
  preferred?: readonly Currency[];
  all?: boolean;
  className?: string;
}

export function CurrencyField({
  field,
  id,
  label,
  hint,
  hintRole,
  preferred,
  all,
  className,
}: Readonly<Props>) {
  const { error, ...aria } = fieldAria(field, { id, hint });

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      hintRole={hintRole}
      error={error}
      className={className}
    >
      <CurrencySelect
        {...aria}
        id={id}
        all={all}
        value={field.value}
        preferred={preferred}
        onBlur={field.handleBlur}
        onChange={(value) => field.handleChange(value)}
      />
    </FieldShell>
  );
}
