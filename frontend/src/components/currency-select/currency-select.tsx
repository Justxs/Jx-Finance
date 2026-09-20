import type { FocusEventHandler } from "react";
import { Currency } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { useCurrencyName, useUsableCurrencies } from "@/hooks/use-formatters";

interface Props {
  id?: string;
  value: Currency;
  onChange: (value: Currency) => void;
  preferred?: readonly Currency[];
  only?: readonly Currency[];
  all?: boolean;
  compact?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
}

export const allCurrencies: readonly Currency[] = Object.values(Currency);
const noPreference: readonly Currency[] = [];

export function orderCurrencies(preferred: readonly Currency[]) {
  const first = [...new Set(preferred)];
  const rest = allCurrencies
    .filter((currency) => !first.includes(currency))
    .toSorted((left, right) => left.localeCompare(right));

  return [...first, ...rest];
}

export function CurrencySelect({
  id,
  value,
  onChange,
  preferred = noPreference,
  only,
  all = false,
  compact = false,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  onBlur,
}: Readonly<Props>) {
  const currencyName = useCurrencyName();
  const usable = useUsableCurrencies();
  const offered = orderCurrencies(preferred).filter(
    (currency) => all || currency === value || usable.includes(currency),
  );
  const currencies = only ? [...new Set(only)] : offered;

  if (compact && !all && usable.length <= 1 && usable.includes(value)) {
    return null;
  }

  const field = (
    <SelectField
      id={id}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      options={currencies.map((currency) => ({
        value: currency,
        label: compact
          ? currency.toUpperCase()
          : `${currency.toUpperCase()} · ${currencyName(currency)}`,
      }))}
    />
  );

  return compact ? <div className="w-24 shrink-0">{field}</div> : field;
}
