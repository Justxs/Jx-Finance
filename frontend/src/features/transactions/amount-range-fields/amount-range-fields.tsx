import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input/input";
import {
  type AmountRangeDraft,
  isAmountText,
} from "@/features/transactions/transaction-filter-fields";

interface Props {
  label: string;
  value: AmountRangeDraft;
  onChange: (value: AmountRangeDraft) => void;
  onBlur?: () => void;
}

export function AmountRangeFields({ label, value, onChange, onBlur }: Readonly<Props>) {
  const { t } = useTranslation();
  const bounds = [
    { key: "min", label: t("filters.amountFrom") },
    { key: "max", label: t("filters.amountTo") },
  ] as const;

  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {bounds.map((bound) => (
          <label key={bound.key} className="space-y-1 text-xs text-muted-foreground">
            {bound.label}
            <Input
              inputMode="decimal"
              placeholder="0.00"
              value={value[bound.key]}
              aria-invalid={!isAmountText(value[bound.key])}
              onChange={(event) => onChange({ ...value, [bound.key]: event.target.value })}
              onBlur={onBlur}
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t("filters.amountHint")}</p>
    </fieldset>
  );
}
