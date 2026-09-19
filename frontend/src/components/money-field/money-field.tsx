import type { Ref } from "react";
import type { Currency } from "@/api/generated/model";
import { CurrencySelect } from "@/components/currency-select";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  ref?: Ref<HTMLInputElement>;
  currency: Currency;
  onCurrencyChange: (value: Currency) => void;
  currencyLabel: string;
  currencyError?: string;
  preferred?: readonly Currency[];
  only?: readonly Currency[];
}

export function MoneyField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  placeholder = "0.00",
  disabled,
  ref,
  currency,
  onCurrencyChange,
  currencyLabel,
  currencyError,
  preferred,
  only,
}: Readonly<Props>) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const currencyErrorId = `${id}-currency-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          ref={ref}
          inputMode="decimal"
          placeholder={placeholder}
          className="min-w-0 flex-1"
          disabled={disabled}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
        />
        <CurrencySelect
          compact
          aria-label={currencyLabel}
          aria-invalid={Boolean(currencyError)}
          aria-describedby={currencyError ? currencyErrorId : undefined}
          value={currency}
          preferred={preferred}
          only={only}
          onChange={onCurrencyChange}
        />
      </div>
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <FieldError id={errorId} message={error} />
      <FieldError id={currencyErrorId} message={currencyError} />
    </div>
  );
}
