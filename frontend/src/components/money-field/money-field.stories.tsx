import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { Currency } from "@/api/generated/model";
import { MoneyField } from "./money-field";

const meta = {
  title: "Components/MoneyField",
  component: MoneyField,
  args: {
    id: "money-field",
    label: "Amount",
    value: "",
    onChange: () => undefined,
    currency: "eur",
    onCurrencyChange: () => undefined,
    currencyLabel: "Currency",
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    const [currency, setCurrency] = useState<Currency>(args.currency);
    return (
      <div className="w-72">
        <MoneyField
          {...args}
          value={value}
          onChange={setValue}
          currency={currency}
          onCurrencyChange={setCurrency}
        />
      </div>
    );
  },
} satisfies Meta<typeof MoneyField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = { args: { value: "1084.20", currency: "usd" } };

export const WithHint: Story = { args: { hint: "Charged on top of the amount." } };

export const WithError: Story = { args: { value: "abc", error: "Enter a positive amount." } };

export const WithCurrencyError: Story = {
  args: { value: "100", currencyError: "Pick two different currencies." },
};

export const OnlyTwo: Story = { args: { only: ["eur", "usd"] } };

export const PreferredFirst: Story = { args: { preferred: ["usd", "gbp"], currency: "usd" } };

export const Disabled: Story = { args: { disabled: true, placeholder: "Same as sent" } };

export const Dark: Story = { globals: { theme: "dark" } };
