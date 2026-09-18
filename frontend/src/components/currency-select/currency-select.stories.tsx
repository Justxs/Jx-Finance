import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { Currency } from "@/api/generated/model";
import { CurrencySelect } from "./currency-select";

const meta = {
  title: "Components/CurrencySelect",
  component: CurrencySelect,
  args: { value: "eur", onChange: () => undefined, "aria-label": "Currency" },
  render: function Render(args) {
    const [value, setValue] = useState<Currency>(args.value);
    return (
      <div className={args.compact ? "w-24" : "w-72"}>
        <CurrencySelect {...args} value={value} onChange={setValue} />
      </div>
    );
  },
} satisfies Meta<typeof CurrencySelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Compact: Story = { args: { compact: true } };

export const PreferredFirst: Story = { args: { preferred: ["usd", "gbp"], value: "usd" } };

export const OnlyTwo: Story = { args: { only: ["eur", "usd"], compact: true } };

export const Lithuanian: Story = { globals: { locale: "lt" } };
