import { createFormHook, getFormHookHelpers } from "@tanstack/react-form";
import { CheckboxField } from "./checkbox-field";
import { DateField } from "./date-field";
import { MoneyAmountField } from "./money-amount-field";
import { MoneyInputField } from "./money-input-field";
import { SelectFieldControl } from "./select-field-control";
import { SubmitButton } from "./submit-button";
import { TextField } from "./text-field";

const { fieldComponent } = getFormHookHelpers();

export const { useAppForm, appFormOptions } = createFormHook({
  fieldComponents: {
    TextField: fieldComponent.loose(TextField, "field"),
    MoneyInputField: fieldComponent.loose(MoneyInputField, "field"),
    SelectFieldControl: fieldComponent.loose(SelectFieldControl, "field"),
    DateField: fieldComponent.loose(DateField, "field"),
    CheckboxField: fieldComponent.loose(CheckboxField, "field"),
    MoneyAmountField: fieldComponent.loose(MoneyAmountField, "field"),
  },
  formComponents: { SubmitButton },
});
