import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { TransactionsLink } from "./transactions-link";

const meta = {
  title: "Components/TransactionsLink",
  component: TransactionsLink,
  parameters: { route: "/budgets" },
  args: {
    name: "Groceries",
    filter: {
      categoryId: "00000000-0000-4000-8000-000000000001",
      type: "expense",
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
    },
  },
} satisfies Meta<typeof TransactionsLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "Groceries" });
    await expect(link).toHaveAttribute("href", expect.stringContaining("/transactions?"));
    await expect(link).toHaveAttribute("href", expect.stringContaining("type=expense"));
  },
};
