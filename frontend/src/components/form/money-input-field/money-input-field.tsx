import { TextField, type TextFieldProps } from "../text-field/text-field";

export function MoneyInputField({ placeholder = "0.00", ...props }: Readonly<TextFieldProps>) {
  return <TextField inputMode="decimal" placeholder={placeholder} {...props} />;
}
