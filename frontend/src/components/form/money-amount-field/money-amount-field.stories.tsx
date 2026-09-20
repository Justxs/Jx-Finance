import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, within } from "storybook/test";
import { z } from "zod";
import { Currency } from "@/api/generated/model";
import { isPositiveMoney } from "@/lib/validation";
import { useAppForm } from "../app-form";

interface DemoProps {
  hint?: string;
  disabled?: boolean;
}

interface Values {
  amount: string;
  currency: Currency;
}

function Demo({ hint, disabled }: Readonly<DemoProps>) {
  const defaultValues: Values = { amount: "", currency: "eur" };
  const form = useAppForm({
    defaultValues,
    validators: [
      {
        run: z.object({
          amount: z.string().refine(isPositiveMoney, "Enter a positive amount."),
          currency: z.enum(Currency),
        }),
        triggers: ["change"],
      },
    ],
  });

  return (
    <div className="w-72">
      <form.Field name="currency">
        {(currencyField) => (
          <form.Field name="amount">
            {(field) => (
              <field.MoneyAmountField
                id="demo-money"
                label="Amount"
                currencyLabel="Currency"
                currencyField={currencyField}
                hint={hint}
                disabled={disabled}
                blankWhenDisabled
                placeholder={disabled ? "Same as sent" : undefined}
              />
            )}
          </form.Field>
        )}
      </form.Field>
    </div>
  );
}

const meta = {
  title: "Components/Form/MoneyAmountField",
  component: Demo,
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = { args: { hint: "Charged on top of the amount." } };

export const Disabled: Story = { args: { disabled: true } };

export const Invalid: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fireEvent.change(canvas.getByLabelText("Amount"), { target: { value: "abc" } });
    await expect(await canvas.findByText("Enter a positive amount.")).toHaveAttribute(
      "id",
      "demo-money-error",
    );
  },
};
