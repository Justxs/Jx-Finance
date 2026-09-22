import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { BreakdownList } from "./breakdown-list";

const meta = {
  title: "Components/BreakdownList",
  component: BreakdownList,
  decorators: [withWidth("card")],
  parameters: { route: "/reports" },
  args: {
    dateFrom: "2026-09-01",
    dateTo: "2026-09-30",
    rows: [
      {
        key: "groceries",
        name: "Groceries",
        amount: 412.3,
        earlier: null,
        filter: { categoryId: "00000000-0000-4000-8000-000000000001" },
        icon: "shopping-cart",
      },
      {
        key: "transport",
        name: "Transport",
        amount: 128.9,
        earlier: null,
        filter: { categoryId: "00000000-0000-4000-8000-000000000002" },
        icon: "car",
      },
      { key: "other", name: "Other", amount: 64.5, earlier: null, icon: "shapes" },
    ],
  },
} satisfies Meta<typeof BreakdownList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "Groceries" })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Other" })).not.toBeInTheDocument();
  },
};

export const Compared: Story = {
  args: {
    rows: [
      {
        key: "holiday",
        name: "Holiday",
        amount: 820,
        earlier: 400,
        filter: { tagIds: "00000000-0000-4000-8000-000000000003" },
      },
      { key: "untagged", name: "Untagged", amount: 120, earlier: 180, muted: true },
    ],
  },
};

export const Income: Story = {
  args: {
    type: "income",
    rows: [
      { key: "salary", name: "Salary", amount: 3200, earlier: 3000, icon: "banknote" },
      { key: "interest", name: "Interest", amount: 42.5, earlier: 50, icon: "piggy-bank" },
    ],
  },
};
