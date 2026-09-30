import type { FocusEventHandler } from "react";
import { useTranslation } from "react-i18next";
import type { Currency } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { useUsableCurrencies } from "@/hooks/use-currencies";
import { useCurrencyName } from "@/hooks/use-formatters";
import { ALL_CURRENCIES } from "@/lib/currency";

interface Props {
  id?: string;
  value: Currency;
  onChange: (value: Currency) => void;
  preferred?: readonly Currency[];
  preferredLabel?: string;
  only?: readonly Currency[];
  all?: boolean;
  compact?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
}

const noPreference: readonly Currency[] = [];

export function orderCurrencies(preferred: readonly Currency[]) {
  const first = [...new Set(preferred)];
  const rest = ALL_CURRENCIES.filter((currency) => !first.includes(currency)).toSorted(
    (left, right) => left.localeCompare(right),
  );

  return [...first, ...rest];
}

export function CurrencySelect({
  id,
  value,
  onChange,
  preferred = noPreference,
  preferredLabel,
  only,
  all = false,
  compact = false,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  onBlur,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const currencyName = useCurrencyName();
  const usable = useUsableCurrencies();
  const offered = orderCurrencies(preferred).filter(
    (currency) => all || currency === value || usable.includes(currency),
  );
  const currencies = only ? [...new Set(only)] : offered;
  const grouped =
    Boolean(preferredLabel) &&
    !only &&
    currencies.some((currency) => preferred.includes(currency)) &&
    currencies.some((currency) => !preferred.includes(currency));

  function groupOf(currency: Currency) {
    if (!grouped) {
      return undefined;
    }
    return preferred.includes(currency) ? preferredLabel : t("currencyGroups.other");
  }

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
        group: groupOf(currency),
        label: compact
          ? currency.toUpperCase()
          : `${currency.toUpperCase()} · ${currencyName(currency)}`,
      }))}
    />
  );

  return compact ? <div className="w-24 shrink-0">{field}</div> : field;
}
