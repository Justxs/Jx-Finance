import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { SignedAmount } from "./signed-amount";

const meta = {
  title: "Components/SignedAmount",
  component: SignedAmount,
  args: { value: 1284.5 },
} satisfies Meta<typeof SignedAmount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gain: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("+€1,284.50")).toHaveClass("text-income");
  },
};

export const Loss: Story = {
  args: { value: -532.19 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("−€532.19")).toHaveClass("text-expense");
  },
};

export const Zero: Story = {
  args: { value: 0 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("€0.00")).toHaveClass("text-foreground");
  },
};

export const ExpenseTotal: Story = {
  args: { value: 1312.4, sign: "−" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("−€1,312.40")).toHaveClass("text-expense");
  },
};

export const ForeignCurrency: Story = {
  args: { value: 42.3, currency: "usd", className: "font-semibold" },
};

export const WithDetail: Story = {
  args: {
    value: -42.3,
    children: <span className="block text-xs">−3.1%</span>,
  },
};
