import type { FieldWithValue } from "@tanstack/react-form";
import type { Ref } from "react";
import type { Currency } from "@/api/generated/model";
import { CurrencySelect } from "@/components/currency-select/currency-select";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input/input";
import { FieldShell, fieldAria } from "../field-shell/field-shell";

interface Props {
  field: FieldWithValue<string>;
  currencyField: FieldWithValue<Currency>;
  id: string;
  label: string;
  currencyLabel: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  blankWhenDisabled?: boolean;
  touchedOnly?: boolean;
  ref?: Ref<HTMLInputElement>;
  preferred?: readonly Currency[];
  only?: readonly Currency[];
  onCurrencyChange?: (currency: Currency) => void;
}

export function MoneyAmountField({
  field,
  currencyField,
  id,
  label,
  currencyLabel,
  hint,
  placeholder = "0.00",
  disabled,
  blankWhenDisabled,
  touchedOnly,
  ref,
  preferred,
  only,
  onCurrencyChange,
}: Readonly<Props>) {
  const { error, ...aria } = fieldAria(field, { id, hint, touchedOnly });
  const currencyId = `${id}-currency`;
  const { error: currencyError, ...currencyAria } = fieldAria(currencyField, { id: currencyId });

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      footer={<FieldError id={`${currencyId}-error`} message={currencyError} />}
    >
      <div className="flex gap-2">
        <Input
          {...aria}
          id={id}
          ref={ref}
          inputMode="decimal"
          placeholder={placeholder}
          className="min-w-0 flex-1"
          disabled={disabled}
          value={disabled && blankWhenDisabled ? "" : field.value}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
        />
        <CurrencySelect
          compact
          {...currencyAria}
          aria-label={currencyLabel}
          value={currencyField.value}
          preferred={preferred}
          only={only}
          onChange={(next) => {
            currencyField.handleChange(next);
            onCurrencyChange?.(next);
          }}
        />
      </div>
    </FieldShell>
  );
}
