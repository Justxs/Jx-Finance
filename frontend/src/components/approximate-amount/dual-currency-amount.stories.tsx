import type { Meta, StoryObj } from "@storybook/react-vite";
import { DualCurrencyAmount } from "./dual-currency-amount";

const meta = {
  title: "Components/DualCurrencyAmount",
  component: DualCurrencyAmount,
  args: {
    value: 1284.5,
    currency: "eur",
    secondaryValue: 1392.1,
    secondaryCurrency: "usd",
  },
} satisfies Meta<typeof DualCurrencyAmount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Strong: Story = { args: { strong: true } };

export const Approximate: Story = {
  args: {
    value: 1392.1,
    currency: "usd",
    secondaryValue: 1284.5,
    secondaryCurrency: "eur",
    approximate: true,
  },
};

export const SignedGain: Story = {
  args: { value: -42.3, secondaryValue: -45.84, signed: true, strong: true },
};

export const SameCurrency: Story = { args: { secondaryCurrency: "eur" } };

export const MissingSecondary: Story = { args: { secondaryValue: null } };
