import type { FieldWithValue } from "@tanstack/react-form";
import type { Ref } from "react";
import type { Currency } from "@/api/generated/model";
import { MoneyField } from "@/components/money-field";

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
  placeholder,
  disabled,
  blankWhenDisabled,
  touchedOnly,
  ref,
  preferred,
  only,
  onCurrencyChange,
}: Readonly<Props>) {
  const visible = !touchedOnly || field.meta.isTouched;

  return (
    <MoneyField
      id={id}
      ref={ref}
      label={label}
      hint={hint}
      placeholder={placeholder}
      disabled={disabled}
      value={disabled && blankWhenDisabled ? "" : field.value}
      error={visible ? field.errors[0]?.message : undefined}
      onBlur={field.handleBlur}
      onChange={field.handleChange}
      currency={currencyField.value}
      currencyLabel={currencyLabel}
      currencyError={currencyField.errors[0]?.message}
      preferred={preferred}
      only={only}
      onCurrencyChange={(next) => {
        currencyField.handleChange(next);
        onCurrencyChange?.(next);
      }}
    />
  );
}
