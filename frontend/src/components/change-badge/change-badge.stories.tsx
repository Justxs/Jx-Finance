import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { changeOf } from "@/lib/comparison";
import { ChangeBadge } from "./change-badge";

const meta = {
  title: "Components/ChangeBadge",
  component: ChangeBadge,
  args: { change: changeOf("1250.00", "1000.00"), good: "up" },
} satisfies Meta<typeof ChangeBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MoreIncomeIsBetter: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(/better than the earlier period|geriau nei ankstesniu laikotarpiu/i),
    ).toBeInTheDocument();
  },
};

export const MoreSpendingIsWorse: Story = {
  args: { change: changeOf("1250.00", "1000.00"), good: "down" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(/worse than the earlier period|prasčiau nei ankstesniu laikotarpiu/i),
    ).toBeInTheDocument();
  },
};

export const LessSpendingIsBetter: Story = {
  args: { change: changeOf("820.50", "1000.00"), good: "down" },
};

export const Unchanged: Story = {
  args: { change: changeOf("1000.00", "1000.00"), good: "up" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(/unchanged from the earlier period|nepakito nuo ankstesnio laikotarpio/i),
    ).toBeInTheDocument();
  },
};

export const FromNothing: Story = {
  args: { change: changeOf("340.00", "0.00"), good: "up" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/up from nothing|anksčiau nebuvo nieko/i)).toBeVisible();
    await expect(canvas.queryByText(/∞|infinity/i)).toBeNull();
  },
};

export const DownToNothing: Story = {
  args: { change: changeOf("0.00", "340.00"), good: "down" },
};

export const WithoutAComparison: Story = {
  args: { change: null },
};
