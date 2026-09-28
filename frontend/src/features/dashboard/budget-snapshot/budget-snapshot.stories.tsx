import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { BudgetSnapshot } from "./budget-snapshot";

const meta = {
  title: "Features/Dashboard/BudgetSnapshot",
  component: BudgetSnapshot,
  decorators: [withWidth("column")],
} satisfies Meta<typeof BudgetSnapshot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const meters = await canvas.findAllByRole("meter", { name: /of the period passed|praėjo/i });
    await expect(meters.length).toBeGreaterThan(0);
  },
};

export const EarlierMonth: Story = {
  args: { asOf: "2026-03-31" },
  play: async ({ canvas }) => {
    await canvas.findAllByRole("meter");
    await expect(canvas.queryByRole("meter", { name: /of the period passed|praėjo/i })).toBeNull();
  },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
