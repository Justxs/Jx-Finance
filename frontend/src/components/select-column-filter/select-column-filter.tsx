import { SelectField } from "@/components/select-field/select-field";
import { ColumnFilter } from "@/components/ui/column-filter/column-filter";
import type { SelectOption } from "@/lib/options";

interface SelectFilterProps<T extends string> {
  label: string;
  value: T | "";
  options: SelectOption<T | "">[];
  onChange: (value: T | "") => void;
}

export function SelectColumnFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: Readonly<SelectFilterProps<T>>) {
  const chosen = options.find((option) => option.value === value)?.label;
  return (
    <ColumnFilter<T | "">
      label={label}
      value={value}
      empty=""
      summary={typeof chosen === "string" ? chosen : undefined}
      onApply={onChange}
    >
      {(draft, setDraft) => (
        <SelectField aria-label={label} value={draft} onChange={setDraft} options={options} />
      )}
    </ColumnFilter>
  );
}
