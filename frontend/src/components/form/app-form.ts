import { createFormHook, getFormHookHelpers } from "@tanstack/react-form";
import { CheckboxField } from "./checkbox-field/checkbox-field";
import { CurrencyField } from "./currency-field/currency-field";
import { DateField } from "./date-field/date-field";
import { FormActions } from "./form-actions/form-actions";
import { FormShell } from "./form-shell/form-shell";
import { MoneyAmountField } from "./money-amount-field/money-amount-field";
import { MoneyInputField } from "./money-input-field/money-input-field";
import { SelectFieldControl } from "./select-field-control/select-field-control";
import { SubmitButton } from "./submit-button/submit-button";
import { TextField } from "./text-field/text-field";

const { fieldComponent } = getFormHookHelpers();

export const { useAppForm, appFormOptions, defineAppFieldGroup } = createFormHook({
  fieldComponents: {
    TextField: fieldComponent.loose(TextField, "field"),
    MoneyInputField: fieldComponent.loose(MoneyInputField, "field"),
    SelectFieldControl: fieldComponent.loose(SelectFieldControl, "field"),
    DateField: fieldComponent.loose(DateField, "field"),
    CheckboxField: fieldComponent.loose(CheckboxField, "field"),
    CurrencyField: fieldComponent.loose(CurrencyField, "field"),
    MoneyAmountField: fieldComponent.loose(MoneyAmountField, "field"),
  },
  formComponents: { SubmitButton, FormShell, FormActions },
});
