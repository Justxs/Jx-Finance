import { TextField, type TextFieldProps } from "@/components/form/text-field/text-field";
import { useNumberFormat } from "@/hooks/use-formatters";

export function MoneyInputField({ placeholder, ...props }: Readonly<TextFieldProps>) {
  const zero = useNumberFormat({ minimumFractionDigits: 2 }).format(0);

  return <TextField inputMode="decimal" placeholder={placeholder ?? zero} {...props} />;
}
