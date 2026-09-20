import type { ComponentProps } from "react";
import type { Currency } from "@/api/generated/model";
import { defineAppFieldGroup } from "../app-form";
import type { MoneyAmountField } from "../money-amount-field/money-amount-field";

const moneyPairFieldGroup = defineAppFieldGroup(({ strict }) => ({
  amount: strict<string>(),
  currency: strict<Currency>(),
}));

type Props = Omit<ComponentProps<typeof MoneyAmountField>, "field" | "currencyField"> & {
  fields: typeof moneyPairFieldGroup.fields;
};

function MoneyPairFieldGroup({ fields, ...props }: Readonly<Props>) {
  return (
    <fields.Field name="currency">
      {(currencyField) => (
        <fields.Field name="amount">
          {(field) => <field.MoneyAmountField currencyField={currencyField} {...props} />}
        </fields.Field>
      )}
    </fields.Field>
  );
}

export const MoneyPairField = moneyPairFieldGroup.bindComponent(MoneyPairFieldGroup, "fields");
